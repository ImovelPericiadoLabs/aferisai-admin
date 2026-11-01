import type { WebhookEventCatalogItem, WebhookTestResult } from "./api";
import { EVENT_LABELS } from "./webhook-event-labels";

export function WebhookSimulateSection({
  events,
  simType,
  simResult,
  busy,
  onSimType,
  onSimulate,
}: {
  events: WebhookEventCatalogItem[];
  simType: string;
  simResult: WebhookTestResult | null;
  busy: boolean;
  onSimType: (value: string) => void;
  onSimulate: () => void;
}) {
  return (
    <div className="wh-block">
      <h5>Simular evento</h5>
      <p className="form-hint">
        Envia dados fictícios (marcados como sintéticos) ao destino. Não cria
        análise nem cobrança; limite de dez por hora.
      </p>
      <div className="wh-actions">
        <select
          className="input"
          aria-label="Evento a simular"
          value={simType}
          disabled={busy}
          onChange={(event) => onSimType(event.target.value)}
        >
          <option value="webhook.test">Evento de teste</option>
          {events.map((item) => (
            <option key={item.type} value={item.type}>
              {EVENT_LABELS[item.type] ?? item.type}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary btn-md"
          disabled={busy}
          onClick={() => onSimulate()}
        >
          Enviar simulação
        </button>
      </div>
      {simResult && (
        <div
          className={`alert ${simResult.status === "delivered" ? "alert-success" : "alert-warning"}`}
          role="status"
        >
          {simResult.status === "delivered"
            ? `O destino respondeu HTTP ${simResult.http_status}.`
            : "Sem confirmação de entrega. Veja a aba Entregas."}
        </div>
      )}
    </div>
  );
}
