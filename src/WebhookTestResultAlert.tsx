import type { WebhookTestResult } from "./api";

export function WebhookTestResultAlert({ test }: { test: WebhookTestResult }) {
  return (
    <div
      className={`alert ${test.status === "delivered" ? "alert-success" : "alert-warning"}`}
      role="status"
    >
      <strong>
        {test.status === "delivered"
          ? "Teste recebido pelo destino"
          : "Teste sem confirmação de entrega"}
      </strong>
      <div>
        {test.http_status
          ? `HTTP ${test.http_status}`
          : "Sem resposta HTTP confirmada"}
        {test.duration_ms != null ? ` · ${test.duration_ms} ms` : ""}
      </div>
    </div>
  );
}
