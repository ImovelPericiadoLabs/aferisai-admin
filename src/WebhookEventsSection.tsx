import type { WebhookEventCatalogItem } from "./api";
import { Checkbox } from "./controls";
import { EVENT_LABELS } from "./webhook-event-labels";
import {
  allEventsSelected,
  toggleAllEvents,
  toggleEvent,
} from "./webhook-settings-model";

export function WebhookEventsSection({
  catalog,
  catalogFailed,
  events,
  order,
  selected,
  busy,
  dirty,
  setSelected,
  onSave,
}: {
  catalog: WebhookEventCatalogItem[] | null;
  catalogFailed: boolean;
  events: WebhookEventCatalogItem[];
  order: string[];
  selected: string[];
  busy: boolean;
  dirty: boolean;
  setSelected: (update: (now: string[]) => string[]) => void;
  onSave: () => void;
}) {
  return (
    <div className="wh-block">
      <h5>Eventos entregues</h5>
      <p className="form-hint">
        Sem nenhum evento marcado, as novas entregas ficam pausadas. Mudar a
        seleção não recria eventos antigos.
      </p>
      {catalog === null && !catalogFailed ? (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando eventos"
        >
          <span className="skeleton" />
        </div>
      ) : catalogFailed ? (
        <div className="alert alert-warning" role="alert">
          Não foi possível carregar o catálogo de eventos.
        </div>
      ) : (
        <>
          <div className="wh-events-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy || events.length === 0}
              onClick={() => setSelected((now) => toggleAllEvents(now, order))}
            >
              {allEventsSelected(selected, order)
                ? "Limpar seleção"
                : "Selecionar todos"}
            </button>
            <span className="form-hint">
              {selected.filter((type) => order.includes(type)).length} de{" "}
              {events.length} selecionados
            </span>
          </div>
          <div className="wh-events">
            {events.map((item) => (
              <Checkbox
                key={item.type}
                id={`wh-event-${item.type}`}
                label={EVENT_LABELS[item.type] ?? item.type}
                description={`${item.type} · versão ${item.version}`}
                checked={selected.includes(item.type)}
                disabled={busy}
                onChange={() =>
                  setSelected((now) => toggleEvent(now, item.type, order))
                }
              />
            ))}
          </div>
          <div>
            <button
              type="button"
              className="btn btn-primary btn-md"
              disabled={busy || !dirty}
              onClick={() => onSave()}
            >
              Salvar seleção
            </button>
          </div>
        </>
      )}
    </div>
  );
}
