import { IntegrationIcon } from "./IntegrationIcon";
import { relativeTime } from "./integration-insights-model";
import { webhookHost } from "./application-overview-model";
import { deliveryTone, eventLabel } from "./delivery-labels";
import { dateLabel } from "./webhook-deliveries-model";
import type { WebhookDelivery } from "./api";

export function WebhookDeliveryFeed({
  items,
  maxLatency,
  selectedId,
  onOpen,
}: {
  items: WebhookDelivery[];
  maxLatency: number;
  /** Id of the row whose detail panel is open, if any. */
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="feed" aria-label="Lista de entregas">
      {items.map((delivery) => (
        <li key={delivery.id}>
          <button
            className="feed-row"
            data-row-id={delivery.id}
            data-tone={deliveryTone(delivery.status)}
            data-selected={delivery.id === selectedId}
            type="button"
            aria-haspopup="dialog"
            onClick={() => onOpen(delivery.id)}
          >
            <span className="feed-mark" aria-hidden="true">
              <IntegrationIcon
                name={
                  delivery.status === "delivered"
                    ? "check"
                    : delivery.status === "attempted" ||
                        delivery.status === "unknown"
                      ? "close"
                      : "activity"
                }
                size={15}
              />
            </span>
            <span className="feed-main">
              <strong>{eventLabel(delivery.event_type)}</strong>
              <small>
                {webhookHost(delivery.endpoint_url)} ·{" "}
                {delivery.is_test ? "Teste assinado" : "Evento real"}
              </small>
            </span>
            <span className="feed-http">
              {delivery.http_status
                ? `HTTP ${delivery.http_status}`
                : "Sem resposta"}
            </span>
            <span className="feed-latency">
              {delivery.duration_ms != null ? (
                <>
                  <i
                    style={{
                      width: `${Math.max(6, (delivery.duration_ms / maxLatency) * 100)}%`,
                    }}
                  />
                  <small>{delivery.duration_ms} ms</small>
                </>
              ) : (
                <small>—</small>
              )}
            </span>
            <span className="feed-time">
              <strong>
                {relativeTime(delivery.attempted_at || delivery.created_at)}
              </strong>
              <small>
                {dateLabel(delivery.attempted_at || delivery.created_at)}
              </small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
