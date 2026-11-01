import type { SupplierStateAuthState } from "./useSupplierStateAuthRotation";
import { SettingCard } from "./SupplierUi";

export function SupplierStateAuthCard({
  busy,
  state,
}: {
  busy: boolean;
  state: SupplierStateAuthState;
}) {
  const {
    stateAuthOpen,
    setStateAuthOpen,
    stateAuthPassword,
    setStateAuthPassword,
    stateAuthCert,
    setStateAuthCert,
    stateAuthCertPassword,
    setStateAuthCertPassword,
    stateAuthReason,
    setStateAuthReason,
    stateAuthError,
    setStateAuthError,
    submitStateAuth,
  } = state;
  return (
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
            Isso cria uma nova credencial em rascunho. A atual continua ativa
            até você conferir e ativar a nova na lista.
          </p>
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
          <p className="sup-muted">Ou substitua pelo certificado PKCS#12:</p>
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
              onChange={(event) => setStateAuthCertPassword(event.target.value)}
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
  );
}
