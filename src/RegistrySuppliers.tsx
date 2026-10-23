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
      setForm((current) => ({ ...current, password: "", token: "" }));
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
            Contas RI Digital e InfoSimples usadas nos pedidos registrais. Cada
            conta nasce em rascunho e só uma por fornecedor fica ativa.
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
        O login, a senha e o token são cifrados ao salvar e nunca aparecem de
        novo. Cadastrar ou ativar uma conta{" "}
        <strong>não valida o login no fornecedor</strong>, não comprova tarifa
        ou saldo e não autoriza compra: a cobrança registral continua dependendo
        dos demais controles.
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
          <div className="data-table-wrap">
            <table
              className="data-table prov-table"
              aria-label="Contas de fornecedores registrais"
            >
              <thead>
                <tr>
                  <th scope="col">Conta</th>
                  <th scope="col">Credencial</th>
                  <th scope="col">Vínculo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Atualizada</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const status = supplierStatusView(item.status);
                  return (
                    <tr key={item.id}>
                      <td data-label="Conta">
                        <strong>{item.label}</strong>
                        <small className="sup-sub">
                          {supplierLabel(item.provider)} · versão {item.version}
                        </small>
                      </td>
                      <td data-label="Credencial">{item.credential_hint}</td>
                      <td data-label="Vínculo">
                        <code title={item.account_binding_sha256}>
                          {shortDigest(item.account_binding_sha256)}
                        </code>
                      </td>
                      <td data-label="Estado">
                        <span className={`badge badge-${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td data-label="Atualizada">
                        {dateTime.format(new Date(item.updated_at))}
                      </td>
                      <td data-label="Ações">
                        <div className="sup-actions">
                          {item.status !== "active" && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              aria-haspopup="dialog"
                              data-supplier-id={item.id}
                              onClick={() =>
                                setPending({
                                  action: "activate",
                                  account: item,
                                })
                              }
                            >
                              Ativar
                            </button>
                          )}
                          {item.status === "active" && (
                            <button
                              type="button"
                              className="btn btn-ghost-danger btn-sm"
                              aria-haspopup="dialog"
                              data-supplier-id={item.id}
                              onClick={() =>
                                setPending({ action: "suspend", account: item })
                              }
                            >
                              Suspender
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                        label="Digest da conta do portal (opcional)"
                        hint="64 caracteres hexadecimais. Liga a conta InfoSimples à conta do portal."
                        error={
                          submitted ? check.errors.portalDigest : undefined
                        }
                      >
                        <input
                          id="sup-digest"
                          className="input"
                          autoComplete="off"
                          spellCheck={false}
                          value={form.portalDigest}
                          disabled={busy}
                          onChange={(event) =>
                            set("portalDigest", event.target.value)
                          }
                        />
                      </Field>
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
