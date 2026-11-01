import type { RefObject } from "react";
import { createPortal } from "react-dom";
import type { OrganizationListItem } from "./api";
import type { DetailState } from "./partner-directory-model";
import { OrganizationAvatar } from "./OrganizationAvatar";
import { DirectoryStatus } from "./PartnerDirectoryStatus";

export function PartnerSummaryPanel({
  selectedId,
  selectedItem,
  detail,
  panelRef,
  onClose,
  onSelect,
  onRetry,
}: {
  selectedId: string | null;
  selectedItem: OrganizationListItem | null;
  detail: DetailState | null;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (organizationId: string) => void;
  onRetry: () => void;
}) {
  const activeApplications =
    detail?.data?.applications.filter((app) => app.status === "active")
      .length ?? 0;
  return createPortal(
    <>
      {selectedId && (
        <div className="detail-panel-overlay" onClick={() => onClose()} />
      )}
      <aside
        className={`detail-panel${selectedId ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-summary-title"
        aria-hidden={!selectedId}
        ref={panelRef}
      >
        <div className="detail-panel-header">
          <div className="partner-dir-summary-head">
            <OrganizationAvatar
              key={selectedItem?.id ?? "none"}
              id={selectedItem?.id ?? ""}
              name={selectedItem?.name ?? "?"}
              logoUrl={selectedItem?.logo_url}
            />
            <div>
              <h2
                className="partner-dir-summary-title"
                id="partner-summary-title"
              >
                {selectedItem?.name}
              </h2>
              <p className="partner-dir-summary-slug">{selectedItem?.slug}</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            aria-label="Fechar resumo"
            onClick={() => onClose()}
          >
            ✕
          </button>
        </div>
        <div className="detail-panel-body">
          {selectedItem && (
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">Resumo</h3>
              <dl className="detail-panel-field">
                <dt>Estado</dt>
                <dd>
                  <DirectoryStatus status={selectedItem.status} />
                </dd>
                <dt>Aplicações</dt>
                <dd>{selectedItem.applications_count}</dd>
                {detail?.data && (
                  <>
                    <dt>Aplicações ativas</dt>
                    <dd>{activeApplications}</dd>
                    <dt>Ações no catálogo</dt>
                    <dd>{detail.data.permissions.length}</dd>
                  </>
                )}
              </dl>
            </section>
          )}
          {selectedId && !detail && (
            <div
              className="partner-dir-skeleton"
              role="status"
              aria-label="Carregando resumo"
            >
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          )}
          {detail?.error && (
            <div className="error-state" role="alert">
              <span>{detail.error}</span>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => {
                  onRetry();
                }}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {detail?.data && (
            <>
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">Descrição</h3>
                <p className="partner-dir-description">
                  {detail.data.description || "Sem descrição cadastrada."}
                </p>
              </section>
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">Aplicações</h3>
                {detail.data.applications.length === 0 ? (
                  <p className="partner-dir-description">
                    Nenhuma aplicação vinculada.
                  </p>
                ) : (
                  <ul className="partner-dir-apps">
                    {detail.data.applications.map((app) => (
                      <li key={app.id}>
                        <span>
                          <strong>{app.name}</strong>
                          <small>
                            {app.permissions.length}{" "}
                            {app.permissions.length === 1
                              ? "permissão"
                              : "permissões"}
                          </small>
                        </span>
                        <DirectoryStatus status={app.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
        <div className="detail-panel-footer">
          <button
            className="btn btn-primary btn-md"
            type="button"
            disabled={!selectedId}
            onClick={() => selectedId && onSelect(selectedId)}
          >
            Gerenciar parceiro
          </button>
          <button
            className="btn btn-ghost btn-md"
            type="button"
            onClick={() => onClose()}
          >
            Fechar
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
