import type { RefObject } from "react";
import type { PartnerManagementEvent, PartnerPerson } from "./api";
import { dateTime } from "./partner-people-copy";
import {
  eventActor,
  eventLabel,
  eventValueLabel,
} from "./partner-people-model";

export function PartnerHistoryPanel({
  history,
  events,
  eventsFailed,
  panelRef,
  onClose,
}: {
  history: PartnerPerson | null;
  events: PartnerManagementEvent[] | null;
  eventsFailed: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  return (
    <>
      {history && <div className="detail-panel-overlay" onClick={onClose} />}
      <aside
        ref={panelRef}
        className={`detail-panel${history ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-history-title"
        aria-hidden={!history}
      >
        {history && (
          <>
            <div className="detail-panel-header">
              <div>
                <h2 className="rules-panel-title" id="people-history-title">
                  Histórico
                </h2>
                <p className="rules-panel-sub">{history.email}</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                aria-label="Fechar"
                onClick={onClose}
              >
                ✕
              </button>
            </div>
            <div className="detail-panel-body">
              {eventsFailed ? (
                <div className="alert alert-danger" role="alert">
                  Não foi possível carregar o histórico.
                </div>
              ) : events === null ? (
                <div
                  className="rules-skeleton"
                  role="status"
                  aria-label="Carregando"
                >
                  <span className="skeleton" />
                  <span className="skeleton" />
                </div>
              ) : events.length === 0 ? (
                <div className="empty-state" role="status">
                  <strong>Sem registros</strong>
                  <span>
                    Eventos anteriores à trilha de auditoria não são inferidos.
                  </span>
                </div>
              ) : (
                <ol className="people-timeline">
                  {events.map((event) => (
                    <li key={event.id}>
                      <strong>{eventLabel(event.action)}</strong>
                      <small>
                        {dateTime.format(new Date(event.created_at))} ·{" "}
                        {eventActor(event)}
                      </small>
                      {(event.previous_value || event.new_value) && (
                        <small>
                          {eventValueLabel(event.action, event.previous_value)}{" "}
                          → {eventValueLabel(event.action, event.new_value)}
                        </small>
                      )}
                      <p>{event.reason}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
