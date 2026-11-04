import { useId } from "react";
import { type EventGroup } from "./webhook-docs-model";

type Item = { type: string; title: string; status: "implemented" | "proposed" };

/**
 * Event navigation: a searchable, grouped list on wide containers, and a native grouped
 * select on narrow ones (23 chips in a scroller are harder to use than one picker).
 */
export function WebhookEventIndex({
  groups,
  allGroups,
  total,
  selected,
  query,
  onQuery,
  onSelect,
}: {
  groups: EventGroup<Item>[];
  allGroups: EventGroup<Item>[];
  total: number;
  selected: string;
  query: string;
  onQuery: (value: string) => void;
  onSelect: (type: string) => void;
}) {
  const searchId = useId();
  const pickerId = useId();
  return (
    <nav className="wpi" aria-label="Eventos do webhook">
      <div className="wpi-picker">
        <label className="form-field-label" htmlFor={pickerId}>
          Evento
        </label>
        <select
          id={pickerId}
          className="input"
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
        >
          {allGroups.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.events.map((event) => (
                <option key={event.type} value={event.type}>
                  {event.title} ({event.type})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="wpi-list">
        <div className="wpi-search">
          <label className="sr-only" htmlFor={searchId}>
            Buscar evento
          </label>
          <input
            id={searchId}
            className="input"
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Buscar evento"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
        </div>
        <div className="wpi-scroll">
          {groups.length === 0 ? (
            <div className="wpi-empty" role="status">
              <p>Nenhum evento encontrado para “{query.trim()}”.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onQuery("")}
              >
                Limpar busca
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.id} className="wpi-group">
                <h4 className="wpi-group-title">
                  {group.label}
                  <span aria-hidden="true">{group.events.length}</span>
                </h4>
                <ul>
                  {group.events.map((event) => (
                    <li key={event.type}>
                      <button
                        type="button"
                        className="wpi-event"
                        aria-current={
                          selected === event.type ? "true" : undefined
                        }
                        onClick={() => onSelect(event.type)}
                      >
                        <span className="wpi-text">
                          <span className="wpi-label">{event.title}</span>
                          <code>{event.type}</code>
                        </span>
                        {event.status === "proposed" && (
                          <span className="badge badge-info">Proposta</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <p className="wpi-count form-hint" aria-live="polite">
          {query.trim()
            ? `${groups.reduce((sum, group) => sum + group.events.length, 0)} de ${total} eventos`
            : `${total} eventos`}
        </p>
      </div>
    </nav>
  );
}
