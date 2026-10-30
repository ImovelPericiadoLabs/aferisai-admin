import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  activateRegistrySupplierAccount,
  createRegistrySupplierAccount,
  listRegistrySupplierAccounts,
  suspendRegistrySupplierAccount,
  type RegistrySupplierAccount,
  type RegistrySupplierKind,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { OpsTable, type OpsColumn } from "./OpsTable";
import { SupplierAccountEditor } from "./SupplierAccountEditor";
import "./ops.css";
import {
  activationBlock,
  shortDigest,
  supplierBody,
  supplierLabel,
  supplierStatusView,
  validateSupplierForm,
  type SupplierForm,
} from "./supplier-model";
import { useDialogFocus } from "./useDialogFocus";
import type { ToastKind } from "./useToast";
import "./analysis-providers.css";
import "./registry-suppliers.css";

type Filter = "" | RegistrySupplierAccount["status"];
type Pending = {
  action: "activate" | "suspend";
  account: RegistrySupplierAccount;
} | null;

const filters: { value: Filter; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativas" },
  { value: "suspended", label: "Suspensas" },
];

const emptyForm: SupplierForm = {
  label: "",
  provider: "onr",
  email: "",
  password: "",
  token: "",
  portalDigest: "",
  stateLoginCpf: "",
  stateLoginPassword: "",
  statePkcs12Cert: "",
  statePkcs12Password: "",
  reason: "",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function errorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 409)
      return "A conta mudou desde a última leitura. A lista foi atualizada: confira o estado antes de repetir.";
    if (cause.status === 503)
      return `${cause.detail} O cofre pode estar sem a chave privada no servidor.`;
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}

export function RegistrySuppliers({
  csrf,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [items, setItems] = useState<RegistrySupplierAccount[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("");
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RegistrySupplierAccount | null>(null);
  const editTrigger = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const createTrigger = useRef<HTMLButtonElement>(null);

  const load = useCallback(
    async (next?: string) => {
      try {
        const page = await listRegistrySupplierAccounts(next);
        setItems((current) =>
          next ? [...current, ...page.items] : page.items,
        );
        setCursor(page.next_cursor);
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError(errorText(cause));
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  function closeCreate() {
    if (busy) return;
    setCreating(false);
    setForm(emptyForm);
    setSubmitted(false);
    setFormError("");
  }

  useDialogFocus(creating, panelRef, closeCreate, {
    returnFocus: () => createTrigger.current,
  });

  const counts = useMemo(
    () => ({
      "": items.length,
      draft: items.filter((item) => item.status === "draft").length,
      active: items.filter((item) => item.status === "active").length,
      suspended: items.filter((item) => item.status === "suspended").length,
    }),
    [items],
  );
  const visible = items.filter((item) => !filter || item.status === filter);
  const portalAccounts = items.filter(
    (item) => item.provider === "onr" && item.status !== "suspended",
  );
  const check = validateSupplierForm(form);
  const set = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    setBusy(true);
    setFormError("");
    try {
      await createRegistrySupplierAccount(supplierBody(form), csrf);
      setBusy(false);
      setCreating(false);
      setForm(emptyForm);
      setSubmitted(false);
      onToast(
        "Conta cadastrada em rascunho. Ela ainda não é usada.",
        "success",
      );
      await load();
    } catch (cause) {
      // Secrets are not kept after a failed attempt: they must be typed again.
      setForm((current) => ({
        ...current,
        password: "",
        token: "",
        stateLoginPassword: "",
        statePkcs12Cert: "",
        statePkcs12Password: "",
      }));
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        await load();
        setFormError(
          `${errorText(cause)} Por segurança, digite a senha e o token de novo.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function decide(reason: string) {
    if (!pending) return;
    const { action, account } = pending;
    setBusy(true);
    try {
      if (action === "activate")
        await activateRegistrySupplierAccount(
          account.id,
          account.version,
          reason,
          csrf,
        );
      else
        await suspendRegistrySupplierAccount(
          account.id,
          account.version,
          reason,
          csrf,
        );
      setPending(null);
      onToast(
        action === "activate"
          ? "Conta ativada. Isso não valida o login nem autoriza compras."
          : "Conta suspensa. Novas reservas de compra ficam bloqueadas.",
        "success",
      );
      await load();
    } catch (cause) {
      setPending(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        onToast(errorText(cause), "error");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  const columns: OpsColumn<RegistrySupplierAccount>[] = [
    {
      id: "account",
      label: "Conta",
      locked: true,
      render: (item) => (
        <span className="ops-id">
          <strong className="sup-clip ops-name">{item.label}</strong>
          <small>
            {supplierLabel(item.provider)} · versão {item.version}
          </small>
        </span>
      ),
      text: (item) => item.label,
    },
    {
      id: "credential",
      label: "Credencial",
      hideBelow: "tablet",
      render: (item) => (
        <span className="sup-clip">{item.credential_hint}</span>
      ),
      text: (item) => item.credential_hint,
    },
    {
      id: "status",
      label: "Estado",
      render: (item) => {
        const status = supplierStatusView(item.status);
        return (
          <span className={`badge badge-${status.tone}`}>{status.label}</span>
        );
      },
      text: (item) => supplierStatusView(item.status).label,
    },
    {
      id: "updated",
      label: "Atualizada",
      align: "end",
      render: (item) => dateTime.format(new Date(item.updated_at)),
      text: (item) => item.updated_at,
    },
  ];

  const block =
    pending?.action === "activate"
      ? activationBlock(pending.account, items)
      : null;

  return (
    <section className="page providers" aria-labelledby="suppliers-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="suppliers-title">
            Fornecedores registrais
          </h1>
          <p className="page-subtitle">
            Contas RI Digital e InfoSimples dos pedidos registrais. Clique numa
            conta para configurar.
          </p>
        </div>
        <button
          ref={createTrigger}
          className="btn btn-primary btn-md"
          type="button"
          aria-haspopup="dialog"
          onClick={() => setCreating(true)}
        >
          <span aria-hidden="true">＋</span> Nova conta
        </button>
      </header>

      <div className="alert" role="note">
        Segredos são cifrados e não voltam a aparecer. Cadastrar ou ativar uma
        conta <strong>não valida o login no fornecedor</strong> nem autoriza
        compra.
      </div>

      <div
        className="prov-filters"
        role="group"
        aria-label="Filtrar por estado"
      >
        {filters.map((item) => (
          <button
            key={item.label}
            type="button"
            className="prov-chip"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
            <span className="prov-chip-count">{counts[item.value]}</span>
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm prov-refresh"
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Atualizar
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div
          className="prov-skeleton"
          role="status"
          aria-label="Carregando contas"
        >
          {[0, 1, 2].map((index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <div className="error-state" role="alert">
          <strong>Não foi possível consultar as contas</strong>
          <span>{error}</span>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {filter ? "Nenhuma conta neste estado" : "Nenhuma conta cadastrada"}
          </strong>
          <span>
            {filter
              ? "Altere o filtro para ver outras contas."
              : "Cadastre a conta do fornecedor para preparar os pedidos registrais. Nenhuma conta está cadastrada nesta instalação."}
          </span>
        </div>
      ) : (
        <>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <OpsTable
            label="Contas de fornecedores registrais"
            columns={columns}
            rows={visible}
            rowKey={(item) => item.id}
            hidden={[]}
            density="comfortable"
            selectedKey={editing?.id ?? null}
            onOpen={(item, element) => {
              editTrigger.current = element;
              setEditing(item);
            }}
            card={(item) => {
              const status = supplierStatusView(item.status);
              return (
                <>
                  <span className="ops-card-top">
                    <strong className="sup-clip ops-name">{item.label}</strong>
                    <span className={`badge badge-${status.tone}`}>
                      {status.label}
                    </span>
                  </span>
                  <span className="ops-card-meta sup-clip">
                    {supplierLabel(item.provider)} · {item.credential_hint}
                  </span>
                </>
              );
            }}
          />
        </>
      )}

      {cursor && (
        <footer className="prov-footer">
          <span>{items.length} contas carregadas</span>
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={loading}
            onClick={() => void load(cursor)}
          >
            Carregar mais
          </button>
        </footer>
      )}

      <SupplierAccountEditor
        account={
          editing
            ? (items.find((item) => item.id === editing.id) ?? editing)
            : null
        }
        onStatusAction={(action, account) => setPending({ action, account })}
        accounts={items}
        csrf={csrf}
        returnFocus={() => editTrigger.current}
        onClose={() => setEditing(null)}
        onUnauthorized={onUnauthorized}
        onToast={onToast}
        onAccountsChanged={() => void load()}
      />

      <ConfirmDialog
        open={pending !== null}
        tone={pending?.action === "suspend" ? "danger" : "primary"}
        title={
          pending?.action === "activate"
            ? "Ativar esta conta?"
            : "Suspender esta conta?"
        }
        description={
          pending?.action === "activate"
            ? (block ??
              "A conta passa a ser a usada pelos pedidos registrais deste fornecedor. A ativação confere a integridade do cofre, mas não valida o login no fornecedor.")
            : "Novas reservas de compra deste fornecedor ficam bloqueadas. Pedidos já ligados a esta conta exigem conciliação."
        }
        details={
          pending
            ? [
                { label: "Conta", value: pending.account.label },
                {
                  label: "Fornecedor",
                  value: supplierLabel(pending.account.provider),
                },
                {
                  label: "Versão lida",
                  value: String(pending.account.version),
                },
              ]
            : []
        }
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 10,
          max: 500,
        }}
        confirmDisabled={block !== null}
        confirmLabel={
          pending?.action === "activate" ? "Ativar conta" : "Suspender conta"
        }
        busy={busy}
        onConfirm={(reason) => void decide(reason)}
        onCancel={() => setPending(null)}
      />

      {createPortal(
        <>
          {creating && (
            <div className="detail-panel-overlay" onClick={closeCreate} />
          )}
          <aside
            ref={panelRef}
            className={`detail-panel detail-panel-wide${creating ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-form-title"
            aria-hidden={!creating}
          >
            {creating && (
              <form
                noValidate
                className="sup-form"
                autoComplete="off"
                onSubmit={(event) => void submit(event)}
              >
                <div className="detail-panel-header">
                  <div>
                    <h2 className="prov-title" id="supplier-form-title">
                      Nova conta de fornecedor
                    </h2>
                    <p className="prov-sub">
                      Nasce em rascunho e cifrada. Ative depois de conferir.
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar"
                    disabled={busy}
                    onClick={closeCreate}
                  >
                    ✕
                  </button>
                </div>
                <div className="detail-panel-body">
                  {formError && (
                    <div className="alert alert-danger form-alert" role="alert">
                      {formError}
                    </div>
                  )}
                  <Field
                    id="sup-label"
                    label="Nome interno"
                    error={submitted ? check.errors.label : undefined}
                  >
                    <input
                      id="sup-label"
                      className="input"
                      autoComplete="off"
                      maxLength={120}
                      value={form.label}
                      disabled={busy}
                      onChange={(event) => set("label", event.target.value)}
                    />
                  </Field>
                  <Field id="sup-provider" label="Fornecedor">
                    <select
                      id="sup-provider"
                      className="input"
                      value={form.provider}
                      disabled={busy}
                      onChange={(event) => {
                        set(
                          "provider",
                          event.target.value as RegistrySupplierKind,
                        );
                        set("token", "");
                      }}
                    >
                      <option value="onr">{supplierLabel("onr")}</option>
                      <option value="infosimples">
                        {supplierLabel("infosimples")}
                      </option>
                    </select>
                  </Field>
                  <Field
                    id="sup-email"
                    label="Login do portal"
                    error={submitted ? check.errors.email : undefined}
                  >
                    <input
                      id="sup-email"
                      className="input"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={254}
                      value={form.email}
                      disabled={busy}
                      onChange={(event) => set("email", event.target.value)}
                    />
                  </Field>
                  <Field
                    id="sup-password"
                    label="Senha"
                    error={submitted ? check.errors.password : undefined}
                  >
                    <input
                      id="sup-password"
                      className="input"
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      disabled={busy}
                      onChange={(event) => set("password", event.target.value)}
                    />
                  </Field>
                  {form.provider === "infosimples" && (
                    <>
                      <Field
                        id="sup-token"
                        label="Token da InfoSimples"
                        error={submitted ? check.errors.token : undefined}
                      >
                        <input
                          id="sup-token"
                          className="input"
                          type="password"
                          autoComplete="new-password"
                          value={form.token}
                          disabled={busy}
                          onChange={(event) => set("token", event.target.value)}
                        />
                      </Field>
                      <Field
                        id="sup-digest"
                        label="Conta RI Digital vinculada"
                        hint={
                          portalAccounts.length
                            ? "Selecione a conta RI Digital usada com esta credencial. O vínculo identifica os pedidos e custos registrais."
                            : "Cadastre primeiro a conta RI Digital. Se ela não aparecer aqui, carregue mais resultados na lista de fornecedores."
                        }
                        error={
                          submitted ? check.errors.portalDigest : undefined
                        }
                      >
                        <select
                          id="sup-digest"
                          className="input"
                          value={form.portalDigest}
                          disabled={busy}
                          onChange={(event) =>
                            set("portalDigest", event.target.value)
                          }
                        >
                          <option value="">
                            Selecione uma conta RI Digital
                          </option>
                          {portalAccounts.map((account) => (
                            <option
                              key={account.id}
                              value={account.account_binding_sha256}
                            >
                              {account.label} ·{" "}
                              {shortDigest(account.account_binding_sha256)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <fieldset className="sup-state-auth">
                        <legend>
                          Autenticação estadual para MG (opcional)
                        </legend>
                        <p className="form-hint">
                          A InfoSimples exige uma autenticação adicional para
                          MG. Use login gov.br ou certificado PKCS#12. Os
                          segredos ficam apenas no cofre.
                        </p>
                        <Field
                          id="sup-state-login-cpf"
                          label="CPF de login gov.br"
                          error={
                            submitted ? check.errors.stateLoginCpf : undefined
                          }
                        >
                          <input
                            id="sup-state-login-cpf"
                            className="input"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={11}
                            value={form.stateLoginCpf}
                            disabled={busy}
                            onChange={(event) =>
                              set(
                                "stateLoginCpf",
                                event.target.value.replace(/\D/g, ""),
                              )
                            }
                          />
                        </Field>
                        <Field
                          id="sup-state-login-password"
                          label="Senha do login gov.br"
                        >
                          <input
                            id="sup-state-login-password"
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            value={form.stateLoginPassword}
                            disabled={busy}
                            onChange={(event) =>
                              set("stateLoginPassword", event.target.value)
                            }
                          />
                        </Field>
                        <p className="form-hint">Ou, em vez do par acima:</p>
                        <Field
                          id="sup-state-pkcs12"
                          label="Certificado PKCS#12"
                          error={
                            submitted ? check.errors.statePkcs12Cert : undefined
                          }
                        >
                          <textarea
                            id="sup-state-pkcs12"
                            className="input"
                            rows={3}
                            autoComplete="off"
                            value={form.statePkcs12Cert}
                            disabled={busy}
                            onChange={(event) =>
                              set("statePkcs12Cert", event.target.value)
                            }
                          />
                        </Field>
                        <Field
                          id="sup-state-pkcs12-password"
                          label="Senha do certificado"
                        >
                          <input
                            id="sup-state-pkcs12-password"
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            value={form.statePkcs12Password}
                            disabled={busy}
                            onChange={(event) =>
                              set("statePkcs12Password", event.target.value)
                            }
                          />
                        </Field>
                      </fieldset>
                    </>
                  )}
                  <Field
                    id="sup-reason"
                    label="Motivo do cadastro"
                    hint="Fica na trilha de auditoria (10 a 500 caracteres)."
                    error={submitted ? check.errors.reason : undefined}
                  >
                    <textarea
                      id="sup-reason"
                      className="input"
                      value={form.reason}
                      disabled={busy}
                      onChange={(event) => set("reason", event.target.value)}
                    />
                  </Field>
                  <p className="form-hint">
                    Os segredos são enviados uma vez, não ficam salvos no
                    navegador e não aparecem depois. Não os inclua no motivo.
                  </p>
                </div>
                <div className="detail-panel-footer">
                  <button className="btn btn-primary btn-md" disabled={busy}>
                    {busy ? "Cadastrando…" : "Cadastrar em rascunho"}
                  </button>
                  <button
                    className="btn btn-ghost btn-md"
                    type="button"
                    disabled={busy}
                    onClick={closeCreate}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </aside>
        </>,
        document.body,
      )}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-field">
      <label className="form-field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="form-hint sup-error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="form-hint">{hint}</span>
      )}
    </div>
  );
}
