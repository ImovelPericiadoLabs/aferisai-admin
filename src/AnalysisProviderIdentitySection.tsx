import type { AnalysisProviderAccount } from "./api";
import { shortHash } from "./provider-model";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function AnalysisProviderIdentitySection({
  account,
  copied,
  onCopy,
}: {
  account: AnalysisProviderAccount;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="detail-panel-section">
      <h3 className="detail-panel-section-title">Identificação</h3>
      <dl className="detail-panel-field">
        <dt>Região</dt>
        <dd>{account.location || "—"}</dd>
        <dt>Pool de capacidade</dt>
        <dd>{account.pool_key}</dd>
        {account.base_url && (
          <>
            <dt>Endpoint</dt>
            <dd>{account.base_url}</dd>
          </>
        )}
        <dt>Credencial</dt>
        <dd>
          {account.credential_hint}
          <span className="prov-hint"> · não pode ser visualizada</span>
        </dd>
        <dt>Perfil de execução</dt>
        <dd>
          {shortHash(account.execution_profile_sha256)}
          {account.execution_profile_sha256 && (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => onCopy()}
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          )}
        </dd>
        <dt>Versão</dt>
        <dd>{account.version}</dd>
        <dt>Atualizada em</dt>
        <dd>{dateTime.format(new Date(account.updated_at))}</dd>
      </dl>
    </section>
  );
}
