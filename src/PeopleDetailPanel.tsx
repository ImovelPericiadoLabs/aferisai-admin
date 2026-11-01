import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { accountAge, formatPersonDate, type Person } from "./people-model";
import { teamRoleLabel } from "./display-labels";
import { initials } from "./people-initials";
import { StatusBadge } from "./PeopleStatusBadge";

export function PeopleDetailPanel({
  selected,
  panelRef,
  copied,
  onCopy,
  onClose,
  renderManagement,
}: {
  selected: Person | null;
  panelRef: RefObject<HTMLElement | null>;
  copied: boolean;
  onCopy: (id: string) => void;
  onClose: () => void;
  renderManagement?: (person: Person) => ReactNode;
}) {
  return createPortal(
    <>
      {selected && <div className="detail-panel-overlay" onClick={onClose} />}
      <aside
        className={`detail-panel${selected ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-detail-title"
        aria-hidden={!selected}
        ref={panelRef}
      >
        <div className="detail-panel-header">
          <div className="people-detail-head">
            <span className="people-avatar people-avatar-lg">
              {selected ? initials(selected.email) : ""}
            </span>
            <div>
              <h2 className="people-detail-title" id="people-detail-title">
                {selected?.email}
              </h2>
              <div className="people-detail-badges">
                {selected && <StatusBadge status={selected.status} />}
                {selected?.role && (
                  <span className="badge badge-info">
                    {teamRoleLabel(selected.role)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            aria-label="Fechar detalhes"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="detail-panel-body">
          {selected && (
            <>
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">Conta</h3>
                <dl className="detail-panel-field">
                  <dt>E-mail</dt>
                  <dd>{selected.email}</dd>
                  <dt>Estado</dt>
                  <dd>{selected.status === "active" ? "Ativo" : "Suspenso"}</dd>
                  {selected.role && (
                    <>
                      <dt>Papel</dt>
                      <dd>{teamRoleLabel(selected.role)}</dd>
                    </>
                  )}
                  <dt>Criada em</dt>
                  <dd>{formatPersonDate(selected.created_at)}</dd>
                  <dt>Tempo de conta</dt>
                  <dd>{accountAge(selected.created_at)}</dd>
                </dl>
              </section>
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">Identificador</h3>
                <div className="people-id">
                  <code>{selected.id}</code>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => onCopy(selected.id)}
                  >
                    {copied ? "Copiado" : "Copiar ID"}
                  </button>
                </div>
              </section>
              <section className="detail-panel-section">
                <h3 className="detail-panel-section-title">Gestão</h3>
                {renderManagement ? (
                  renderManagement(selected)
                ) : (
                  <p className="people-note">
                    Esta tela é somente de consulta.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
        <div className="detail-panel-footer">
          <button
            className="btn btn-secondary btn-md"
            type="button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
