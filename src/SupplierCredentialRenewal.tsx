import { useState, type FormEvent } from "react";
import {
  Composer,
  ComposerSection,
  ComposerSummary,
  Metrics,
  SettingCard,
} from "./SupplierUi";
import { stepStates } from "./account-model";
import {
  ApiError,
  createRegistrySupplierAccount,
  type RegistrySupplierAccount,
} from "./api";
import {
  credentialProblems,
  credentialSteps,
  shortDigest,
  supplierBody,
  validateSupplierForm,
  type SupplierForm,
} from "./supplier-model";
import type { ToastKind } from "./useToast";

export function SupplierCredentialRenewal({
  account,
  accounts,
  csrf,
  onCreated,
  onUnauthorized,
  onToast,
}: {
  account: RegistrySupplierAccount;
  accounts: RegistrySupplierAccount[];
  csrf: string;
  onCreated: () => void;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [form, setForm] = useState<SupplierForm>({
    label: `${account.label.slice(0, 98)} · nova credencial`,
    provider: account.provider,
    email: "",
    password: "",
    token: "",
    portalDigest: "",
    reason: "",
  });
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const check = validateSupplierForm(form);
  const states = stepStates(credentialSteps(form));
  const set = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await createRegistrySupplierAccount(supplierBody(form), csrf);
      setForm((current) => ({ ...current, password: "", token: "" }));
      setSubmitted(false);
      onToast(
        "Nova credencial criada em rascunho. Confira antes de trocar a conta ativa.",
        "success",
      );
      setOpen(false);
      onCreated();
    } catch (cause) {
      setForm((current) => ({ ...current, password: "", token: "" }));
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível confirmar o cadastro. Atualize a lista antes de tentar outra vez.",
        );
    } finally {
      setBusy(false);
    }
  }

  const dateTime = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <>
      <SettingCard
        title="Credencial em uso"
        help={
          <>
            A credencial antiga continua ligada aos pedidos e custos já feitos.
            A nova nasce em rascunho: depois de conferir, suspenda a conta ativa
            e ative a nova na lista. Publique as tarifas da nova conta antes de
            oferecer cotações.
            {account.provider === "onr" &&
              " Configure de novo o proxy RI Digital na nova conta, se precisar."}{" "}
            Senha e token nunca aparecem de novo.
          </>
        }
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-md"
            aria-haspopup="dialog"
            onClick={() => {
              setSubmitted(false);
              setOpen(true);
            }}
          >
            Trocar credencial
          </button>
        }
      >
        <Metrics
          items={[
            { label: "Identificação", value: account.credential_hint },
            {
              label: "Vínculo",
              value: (
                <code title={account.account_binding_sha256}>
                  {shortDigest(account.account_binding_sha256)}
                </code>
              ),
            },
            { label: "Versão", value: account.version },
            {
              label: "Atualizada",
              value: dateTime.format(new Date(account.updated_at)),
            },
          ]}
        />
      </SettingCard>

      {open && (
        <Composer
          title="Trocar credencial"
          steps={[
            { id: "identity", label: "Identificação", state: states[0] },
            { id: "secrets", label: "Segredos", state: states[1] },
            { id: "reason", label: "Motivo", state: states[2] },
          ]}
          onClose={() => !busy && setOpen(false)}
          summary={
            <ComposerSummary
              title="Resumo da nova credencial"
              rows={[
                { label: "Nome", value: form.label.trim() || "—" },
                { label: "Login", value: form.email.trim() || "—" },
                { label: "Senha", value: form.password ? "Definida" : "—" },
                ...(account.provider === "infosimples"
                  ? [
                      { label: "Token", value: form.token ? "Definido" : "—" },
                      {
                        label: "Conta RI Digital",
                        value:
                          accounts.find(
                            (item) =>
                              item.account_binding_sha256 === form.portalDigest,
                          )?.label ?? "—",
                      },
                    ]
                  : []),
                { label: "Estado ao criar", value: "Rascunho" },
              ]}
              footer={
                <>
                  <button
                    type="submit"
                    form="sup-renew-form"
                    className="btn btn-primary btn-md"
                    disabled={busy}
                  >
                    {busy ? "Salvando…" : "Cadastrar em rascunho"}
                  </button>
                  <p className="sup-muted">
                    A credencial atual continua ativa até você suspendê-la e
                    ativar a nova na lista.
                  </p>
                </>
              }
            />
          }
        >
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {submitted && !check.ok && (
            <div className="alert alert-danger" role="alert">
              Falta ou está inválido: {credentialProblems(form).join("; ")}.
            </div>
          )}
          <form
            id="sup-renew-form"
            className="sup-composer-form"
            onSubmit={(event) => void submit(event)}
            autoComplete="off"
            noValidate
          >
            <ComposerSection
              title="Identificação"
              state={states[0]}
              recap={`${form.label.trim()} · ${form.email.trim()}`}
            >
              <label>
                Nome da nova credencial
                <input
                  className="input"
                  value={form.label}
                  maxLength={120}
                  disabled={busy}
                  aria-invalid={submitted && !!check.errors.label}
                  onChange={(event) => set("label", event.target.value)}
                />
                {submitted && check.errors.label && (
                  <small role="alert" className="sup-error">
                    {check.errors.label}
                  </small>
                )}
              </label>
              <label>
                Login do portal
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  maxLength={254}
                  autoComplete="off"
                  disabled={busy}
                  aria-invalid={submitted && !!check.errors.email}
                  onChange={(event) => set("email", event.target.value)}
                />
                {submitted && check.errors.email && (
                  <small role="alert" className="sup-error">
                    {check.errors.email}
                  </small>
                )}
              </label>
            </ComposerSection>

            <ComposerSection
              title="Segredos"
              state={states[1]}
              recap="Senha definida"
            >
              <label>
                Nova senha
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  autoComplete="new-password"
                  disabled={busy}
                  aria-invalid={submitted && !!check.errors.password}
                  onChange={(event) => set("password", event.target.value)}
                />
                {submitted && check.errors.password ? (
                  <small role="alert" className="sup-error">
                    {check.errors.password}
                  </small>
                ) : (
                  <small>
                    Enviada uma vez, cifrada e nunca mostrada de novo.
                  </small>
                )}
              </label>
              {account.provider === "infosimples" && (
                <>
                  <label>
                    Novo token da InfoSimples
                    <input
                      className="input"
                      type="password"
                      value={form.token}
                      autoComplete="off"
                      disabled={busy}
                      aria-invalid={submitted && !!check.errors.token}
                      onChange={(event) => set("token", event.target.value)}
                    />
                    {submitted && check.errors.token && (
                      <small role="alert" className="sup-error">
                        {check.errors.token}
                      </small>
                    )}
                  </label>
                  <label className="sup-span">
                    Conta RI Digital vinculada
                    <select
                      className="input"
                      value={form.portalDigest}
                      disabled={busy}
                      aria-invalid={submitted && !!check.errors.portalDigest}
                      onChange={(event) =>
                        set("portalDigest", event.target.value)
                      }
                    >
                      <option value="">Selecione a conta</option>
                      {accounts
                        .filter(
                          (item) =>
                            item.provider === "onr" && item.status === "active",
                        )
                        .map((item) => (
                          <option
                            key={item.id}
                            value={item.account_binding_sha256}
                          >
                            {item.label}
                          </option>
                        ))}
                    </select>
                    {submitted && check.errors.portalDigest && (
                      <small role="alert" className="sup-error">
                        {check.errors.portalDigest}
                      </small>
                    )}
                  </label>
                </>
              )}
            </ComposerSection>

            <ComposerSection
              title="Motivo"
              state={states[2]}
              recap={form.reason.trim().slice(0, 50)}
            >
              <label>
                Motivo da troca
                <textarea
                  className="input"
                  rows={3}
                  minLength={10}
                  maxLength={500}
                  value={form.reason}
                  disabled={busy}
                  aria-invalid={submitted && !!check.errors.reason}
                  onChange={(event) => set("reason", event.target.value)}
                />
                {submitted && check.errors.reason ? (
                  <small role="alert" className="sup-error">
                    {check.errors.reason}
                  </small>
                ) : (
                  <small>Fica na auditoria. Sem senhas ou tokens.</small>
                )}
              </label>
            </ComposerSection>
          </form>
        </Composer>
      )}
    </>
  );
}
