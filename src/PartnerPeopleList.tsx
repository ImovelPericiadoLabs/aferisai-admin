import type { PartnerPerson } from "./api";
import { relativeTime } from "./integration-insights-model";
import { roleLabel } from "./partner-roles";
import { actionCopy } from "./partner-people-copy";
import {
  invitationNote,
  personView,
  type PersonAction,
} from "./partner-people-model";

export function PartnerPeopleList({
  items,
  visible,
  loading,
  loadFailed,
  isAdmin,
  busy,
  viewerId,
  now,
  onRetry,
  onAction,
  onHistory,
  onSupport,
}: {
  items: PartnerPerson[];
  visible: PartnerPerson[];
  loading: boolean;
  loadFailed: boolean;
  isAdmin: boolean;
  busy: boolean;
  viewerId?: string;
  now: number;
  onRetry: () => void;
  onAction: (action: PersonAction, person: PartnerPerson) => void;
  onHistory: (person: PartnerPerson) => void;
  onSupport?: (person: PartnerPerson) => void;
}) {
  return (
    <>
      {loading ? (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando pessoas"
        >
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : loadFailed ? (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar as pessoas da parceria.{" "}
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={onRetry}
          >
            Tentar novamente
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {items.length === 0
              ? "Ninguém com acesso ainda"
              : "Ninguém neste filtro"}
          </strong>
          <span>
            {items.length === 0
              ? isAdmin
                ? "Convide a pessoa responsável pela integração para ela entrar no portal."
                : "Peça a um administrador para convidar a pessoa responsável."
              : "Escolha outro filtro para ver as demais pessoas."}
          </span>
        </div>
      ) : (
        <ul className="people-list" aria-label="Pessoas da parceria">
          {visible.map((person) => {
            const view = personView(person, isAdmin);
            const note = invitationNote(person.invitation, now);
            return (
              <li key={person.membership_id}>
                <span className="people-avatar" aria-hidden="true">
                  {person.email.slice(0, 2).toUpperCase()}
                </span>
                <div className="people-main">
                  <strong>
                    {person.email}
                    {person.id === viewerId && " (você)"}
                  </strong>
                  <small>
                    {note ??
                      (person.last_access_at
                        ? `Último acesso ${relativeTime(person.last_access_at, now)}`
                        : person.membership_status === "active"
                          ? "Nunca acessou"
                          : "—")}
                  </small>
                </div>
                <span className="people-status">
                  <span className="badge badge-neutral people-role">
                    {roleLabel(person.role)}
                  </span>
                  <span className={`badge badge-${view.tone}`}>
                    {view.label}
                  </span>
                </span>
                <div className="people-actions">
                  {view.actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={`btn btn-sm ${actionCopy[action].danger ? "btn-ghost-danger" : "btn-secondary"}`}
                      disabled={busy}
                      onClick={() => onAction(action, person)}
                    >
                      {actionCopy[action].button}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    data-person-id={person.id}
                    aria-haspopup="dialog"
                    onClick={() => onHistory(person)}
                  >
                    Histórico
                  </button>
                  {onSupport && person.membership_status === "active" && person.identity_status === "active" && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onSupport(person)}>
                      Abrir como parceiro
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
