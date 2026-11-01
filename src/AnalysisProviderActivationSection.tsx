import type { AnalysisProviderAccount } from "./api";
import {
  canActivate,
  validateExternalReserved,
  validateProfileHash,
} from "./provider-model";

export function AnalysisProviderActivationSection({
  account,
  activation,
  reserved,
  reservedCheck,
  profile,
  profileCheck,
  previewModel,
  credentialChecked,
  busy,
  onReserved,
  onCheck,
  onActivate,
}: {
  account: AnalysisProviderAccount;
  activation: ReturnType<typeof canActivate>;
  reserved: string;
  reservedCheck: ReturnType<typeof validateExternalReserved>;
  profile: string;
  profileCheck: ReturnType<typeof validateProfileHash>;
  previewModel: string;
  credentialChecked: boolean;
  busy: boolean;
  onReserved: (value: string) => void;
  onCheck: () => void;
  onActivate: () => void;
}) {
  return (
    <section className="detail-panel-section">
      <h3 className="detail-panel-section-title">Ativar conta</h3>
      {!activation.ok ? (
        <p className="prov-note">{activation.reason}</p>
      ) : (
        <>
          {account.kind === "vertex_service_account" && (
            <div className="form-field prov-reserved">
              <label className="form-field-label" htmlFor="prov-reserved">
                Reserva externa (0 a 12 chamadas)
              </label>
              <input
                id="prov-reserved"
                className="input"
                type="number"
                min="0"
                max="12"
                step="1"
                value={reserved}
                aria-invalid={!reservedCheck.ok}
                onChange={(event) => onReserved(event.target.value)}
              />
              <span className="form-hint">
                {reservedCheck.ok
                  ? "Chamadas simultâneas reservadas a outros sistemas que usam o mesmo projeto."
                  : reservedCheck.message}
              </span>
            </div>
          )}
          <button
            className="btn btn-secondary btn-md prov-action"
            type="button"
            disabled={busy}
            onClick={() => onCheck()}
          >
            {busy ? "Conferindo…" : "Conferir conta e modelo"}
          </button>
          <div className="form-field">
            <label className="form-field-label" htmlFor="prov-profile">
              Perfil medido (SHA-256)
            </label>
            <input
              id="prov-profile"
              className="input prov-mono"
              value={profile}
              maxLength={80}
              spellCheck={false}
              readOnly
            />
            <span className="form-hint">
              {profile
                ? credentialChecked
                  ? `Acesso ao modelo ${previewModel} confirmado sem gerar análise; isso não comprova saldo nem qualidade jurídica.`
                  : `Perfil ${previewModel} calculado pelo servidor; a credencial Vertex ainda depende dos gates da oferta.`
                : "Clique em Conferir conta e modelo para calcular o perfil no servidor."}
            </span>
          </div>
          <button
            className="btn btn-primary btn-md prov-action"
            type="button"
            disabled={
              busy ||
              (account.kind === "vertex_service_account" &&
                !reservedCheck.ok) ||
              !profileCheck.ok
            }
            onClick={() => onActivate()}
          >
            Ativar conta
          </button>
        </>
      )}
    </section>
  );
}
