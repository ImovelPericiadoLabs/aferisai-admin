import type { FormEvent } from "react";
import { Composer, ComposerSection, ComposerSummary } from "./SupplierUi";
import { stepStates } from "./account-model";
import type { RegistrySupplierAccount } from "./api";
import {
  credentialProblems,
  type SupplierForm,
  validateSupplierForm,
} from "./supplier-model";

export function SupplierCredentialComposer({
  account,
  accounts,
  form,
  set,
  check,
  states,
  submitted,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  account: RegistrySupplierAccount;
  accounts: RegistrySupplierAccount[];
  form: SupplierForm;
  set: <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) => void;
  check: ReturnType<typeof validateSupplierForm>;
  states: ReturnType<typeof stepStates>;
  submitted: boolean;
  busy: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <Composer
      title="Trocar credencial"
      steps={[
        { id: "identity", label: "Identificação", state: states[0] },
        { id: "secrets", label: "Segredos", state: states[1] },
        { id: "reason", label: "Motivo", state: states[2] },
      ]}
      onClose={onClose}
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
                A credencial atual continua ativa até você suspendê-la e ativar
                a nova na lista.
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
        onSubmit={onSubmit}
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
              <small>Enviada uma vez, cifrada e nunca mostrada de novo.</small>
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
                  onChange={(event) => set("portalDigest", event.target.value)}
                >
                  <option value="">Selecione a conta</option>
                  {accounts
                    .filter(
                      (item) =>
                        item.provider === "onr" && item.status === "active",
                    )
                    .map((item) => (
                      <option key={item.id} value={item.account_binding_sha256}>
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
                  O token da InfoSimples não substitui a autenticação exigida
                  pelo portal de MG. Preencha apenas login gov.br ou PKCS#12. Os
                  segredos são cifrados no cofre e não voltam a aparecer.
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
                    aria-invalid={submitted && !!check.errors.statePkcs12Cert}
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
  );
}
