import type { RefObject } from "react";
import { createPortal } from "react-dom";
import type { PartnerCredential } from "./api";
import { PermissionIcon } from "./PermissionIcon";
import { credentialState, expiryNote } from "./credential-model";
import { dateLabel } from "./credential-dates";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";

export function CredentialDetailPanel({
  detail,
  panelRef,
  busy,
  copied,
  permissionDescriptions,
  onClose,
  onCopy,
  onRevoke,
}: {
  detail: PartnerCredential | null;
  panelRef: RefObject<HTMLElement | null>;
  busy: boolean;
  copied: boolean;
  permissionDescriptions: Record<string, string>;
  onClose: () => void;
  onCopy: (value: string) => void;
  onRevoke: (id: string) => void;
}) {
  return createPortal(
    <>
      {detail && (
        <div className="detail-panel-overlay" onClick={() => onClose()} />
      )}
      <aside
        ref={panelRef}
        className={`detail-panel${detail ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cred-detail-title"
        aria-hidden={!detail}
      >
        {detail && (
          <>
            <div className="detail-panel-header">
              <div>
                <h2 className="rules-panel-title" id="cred-detail-title">
                  {detail.name || "Credencial sem nome"}
                </h2>
                <div className="rules-panel-badges">
                  <span
                    className={`badge badge-${credentialState(detail).tone}`}
                  >
                    {credentialState(detail).label}
                  </span>
                  <span className="rules-panel-sub">{expiryNote(detail)}</span>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                aria-label="Fechar"
                onClick={() => onClose()}
              >
                ✕
              </button>
            </div>
            <div className="detail-panel-body">
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">Identificação</h3>
                <div className="cred-id-row">
                  <code>{detail.client_id}</code>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onCopy(detail.client_id)}
                  >
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="form-hint">
                  O segredo não pode ser consultado de novo. Se foi perdido,
                  emita uma nova credencial e revogue esta.
                </p>
              </section>
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">Ciclo de vida</h3>
                <dl className="detail-panel-field">
                  <dt>Emitida em</dt>
                  <dd>{dateLabel(detail.created_at)}</dd>
                  <dt>Vencimento</dt>
                  <dd>
                    {detail.expires_at
                      ? dateLabel(detail.expires_at)
                      : "Sem prazo definido"}
                  </dd>
                  {detail.revoked_at && (
                    <>
                      <dt>Revogada em</dt>
                      <dd>{dateLabel(detail.revoked_at)}</dd>
                    </>
                  )}
                </dl>
              </section>
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">Permissões</h3>
                {detail.scopes?.length ? (
                  <ul className="cred-scope-chips">
                    {detail.scopes.map((scope) => (
                      <li key={scope}>
                        <PermissionIcon code={scope} />
                        <span>
                          <strong>{applicationPermissionLabel(scope)}</strong>
                          <small>
                            {applicationPermissionDescription(
                              scope,
                              permissionDescriptions[scope],
                            )}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="form-hint">
                    Esta credencial não informa permissões.
                  </p>
                )}
              </section>
              {detail.issue_request_id && (
                <section className="detail-panel-section">
                  <h3 className="detail-panel-section-title">Técnico</h3>
                  <dl className="detail-panel-field">
                    <dt>Emissão</dt>
                    <dd>
                      <code>{detail.issue_request_id}</code>
                    </dd>
                  </dl>
                </section>
              )}
            </div>
            {detail.status === "active" && (
              <div className="detail-panel-footer">
                <button
                  type="button"
                  className="btn btn-danger btn-md"
                  disabled={busy}
                  onClick={() => onRevoke(detail.id)}
                >
                  Revogar credencial
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>,
    document.body,
  );
}
