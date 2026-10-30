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
  rotateRegistrySupplierStateAuth,
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
    stateLoginCpf: "",
    stateLoginPassword: "",
    statePkcs12Cert: "",
    statePkcs12Password: "",
    reason: "",
  });
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stateAuthOpen, setStateAuthOpen] = useState(false);
  const [stateAuthCpf, setStateAuthCpf] = useState("");
  const [stateAuthPassword, setStateAuthPassword] = useState("");
  const [stateAuthCert, setStateAuthCert] = useState("");
  const [stateAuthCertPassword, setStateAuthCertPassword] = useState("");
  const [stateAuthReason, setStateAuthReason] = useState("");
  const [stateAuthError, setStateAuthError] = useState("");
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
      setForm((current) => ({
        ...current,
        password: "",
        token: "",
        stateLoginPassword: "",
        statePkcs12Cert: "",
        statePkcs12Password: "",
      }));
      setSubmitted(false);
      onToast(
        "Nova credencial criada em rascunho. Confira antes de trocar a conta ativa.",
        "success",
      );
      setOpen(false);
      onCreated();
    } catch (cause) {
      setForm((current) => ({
        ...current,
        password: "",
        token: "",
        stateLoginPassword: "",
        statePkcs12Cert: "",
        statePkcs12Password: "",
      }));
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

  async function submitStateAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cpf = stateAuthCpf.trim();
    const password = stateAuthPassword;
    const cert = stateAuthCert.trim();
    const certPassword = stateAuthCertPassword;
    const reason = stateAuthReason.trim();
    const loginMode = cpf !== "" || password !== "";
    const certMode = cert !== "" || certPassword !== "";
    if (loginMode && (!/^\d{11}$/.test(cpf) || password === "")) {
      setStateAuthError("Informe CPF de 11 dígitos e a nova senha gov.br.");
      return;
    }
    if (certMode && (cert === "" || certPassword === "")) {
      setStateAuthError("Informe o certificado PKCS#12 e sua senha.");
      return;
    }
    if (loginMode && certMode) {
      setStateAuthError("Escolha login gov.br ou PKCS#12, não os dois.");
      return;
    }
    if (!loginMode && !certMode) {
      setStateAuthError("Informe a nova autenticação estadual.");
      return;
    }
    if (reason.length < 10 || reason.length > 500) {
      setStateAuthError("Informe um motivo entre 10 e 500 caracteres.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setStateAuthError("");
    try {
      await rotateRegistrySupplierStateAuth(
        account.id,
        {
          state_login_cpf: loginMode ? cpf : null,
          state_login_password: loginMode ? password : null,
          state_pkcs12_cert: certMode ? cert : null,
          state_pkcs12_password: certMode ? certPassword : null,
          reason,
        },
        csrf,
      );
      setStateAuthPassword("");
      setStateAuthCert("");
      setStateAuthCertPassword("");
      setStateAuthReason("");
      setStateAuthError("");
      setStateAuthOpen(false);
      onToast(
        "Nova autenticação estadual criada em rascunho. A conta atual continua intacta.",
        "success",
      );
      onCreated();
    } catch (cause) {
      setStateAuthPassword("");
      setStateAuthCert("");
      setStateAuthCertPassword("");
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setStateAuthError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível criar a nova autenticação estadual.",
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
      {account.provider === "infosimples" && (
        <SettingCard
          title="Alterar somente autenticação estadual"
          help="Use esta operação quando a senha gov.br mudou. A senha, o token da InfoSimples e o vínculo RI Digital são reutilizados dentro do cofre; não é necessário redigitá-los."
          actions={
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => {
                setStateAuthError("");
                setStateAuthOpen(true);
              }}
              disabled={busy}
            >
              Alterar senha gov.br
            </button>
          }
        >
          {stateAuthOpen && (
            <form
              className="sup-composer-form"
              onSubmit={(event) => void submitStateAuth(event)}
              noValidate
            >
              {stateAuthError && (
                <div className="alert alert-danger" role="alert">
                  {stateAuthError}
                </div>
              )}
              <p className="sup-muted">
                Isso cria uma nova credencial em rascunho. A atual continua
                ativa até você conferir e ativar a nova na lista.
              </p>
              <label>
                CPF do login gov.br
                <input
                  className="input"
                  inputMode="numeric"
                  maxLength={11}
                  value={stateAuthCpf}
                  disabled={busy}
                  onChange={(event) =>
                    setStateAuthCpf(event.target.value.replace(/\D/g, ""))
                  }
                />
              </label>
              <label>
                Nova senha do login gov.br
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={stateAuthPassword}
                  disabled={busy}
                  onChange={(event) => setStateAuthPassword(event.target.value)}
                />
              </label>
              <p className="sup-muted">
                Ou substitua pelo certificado PKCS#12:
              </p>
              <label>
                Certificado PKCS#12
                <textarea
                  className="input"
                  rows={3}
                  value={stateAuthCert}
                  disabled={busy}
                  onChange={(event) => setStateAuthCert(event.target.value)}
                />
              </label>
              <label>
                Senha do certificado
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={stateAuthCertPassword}
                  disabled={busy}
                  onChange={(event) =>
                    setStateAuthCertPassword(event.target.value)
                  }
                />
              </label>
              <label>
                Motivo da alteração
                <textarea
                  className="input"
                  rows={2}
                  minLength={10}
                  maxLength={500}
                  value={stateAuthReason}
                  disabled={busy}
                  onChange={(event) => setStateAuthReason(event.target.value)}
                />
              </label>
              <div className="sup-card-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-md"
                  disabled={busy}
                  onClick={() => setStateAuthOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={busy}
                >
                  {busy ? "Salvando…" : "Criar nova autenticação"}
                </button>
              </div>
            </form>
          )}
        </SettingCard>
      )}
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
                        label: "Autenticação estadual MG",
                        value:
                          form.stateLoginCpf && form.stateLoginPassword
                            ? "Login gov.br definido"
                            : form.statePkcs12Cert && form.statePkcs12Password
                              ? "PKCS#12 definido"
                              : "Não configurada",
                      },
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
                  <fieldset className="sup-state-auth sup-span">
                    <legend>Autenticação estadual para MG (opcional)</legend>
                    <small>
                      O token da InfoSimples não substitui a autenticação
                      exigida pelo portal de MG. Preencha apenas login gov.br ou
                      PKCS#12. Os segredos são cifrados no cofre e não voltam a
                      aparecer.
                    </small>
                    <label>
                      CPF do login gov.br
                      <input
                        className="input"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={11}
                        value={form.stateLoginCpf}
                        disabled={busy}
                        aria-invalid={submitted && !!check.errors.stateLoginCpf}
                        onChange={(event) =>
                          set(
                            "stateLoginCpf",
                            event.target.value.replace(/\D/g, ""),
                          )
                        }
                      />
                      {submitted && check.errors.stateLoginCpf && (
                        <small role="alert" className="sup-error">
                          {check.errors.stateLoginCpf}
                        </small>
                      )}
                    </label>
                    <label>
                      Senha do login gov.br
                      <input
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        value={form.stateLoginPassword}
                        disabled={busy}
                        onChange={(event) =>
                          set("stateLoginPassword", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Certificado PKCS#12
                      <textarea
                        className="input"
                        rows={3}
                        autoComplete="off"
                        value={form.statePkcs12Cert}
                        disabled={busy}
                        aria-invalid={
                          submitted && !!check.errors.statePkcs12Cert
                        }
                        onChange={(event) =>
                          set("statePkcs12Cert", event.target.value)
                        }
                      />
                      {submitted && check.errors.statePkcs12Cert && (
                        <small role="alert" className="sup-error">
                          {check.errors.statePkcs12Cert}
                        </small>
                      )}
                    </label>
                    <label>
                      Senha do certificado
                      <input
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        value={form.statePkcs12Password}
                        disabled={busy}
                        onChange={(event) =>
                          set("statePkcs12Password", event.target.value)
                        }
                      />
                    </label>
                  </fieldset>
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
