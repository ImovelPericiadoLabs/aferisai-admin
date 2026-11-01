import type { ReactNode } from "react";
import type { WebhookEndpoint, WebhookTestResult } from "./api";
import { eventsSummary } from "./webhook-settings-model";
import { nextStepText, nextStepTitle } from "./webhook-endpoint-model";

export function WebhookDestination({
  endpoint,
  step,
  test,
  testResult,
  canManage,
  canEdit,
  busy,
  onContinue,
  onRemove,
}: {
  endpoint: WebhookEndpoint;
  step: number;
  test: WebhookTestResult | null;
  testResult: ReactNode;
  canManage: boolean;
  canEdit: boolean;
  busy: boolean;
  onContinue: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <div className="card webhook-destination">
        <div>
          <small className="rules-cell-sub">Destino completo</small>
          <strong className="rules-cell-main">{endpoint.url}</strong>
          <small className="rules-cell-sub">
            Eventos: {eventsSummary(endpoint.event_types)}
          </small>
        </div>
        <span
          className={`badge ${endpoint.status === "active" ? "badge-success" : endpoint.status === "draft" ? "badge-neutral" : "badge-warning"}`}
        >
          {endpoint.status === "active"
            ? "Ativo"
            : endpoint.status === "draft"
              ? "Em configuração"
              : "Suspenso"}
        </span>
      </div>
      {endpoint.status === "active" && testResult}
      {endpoint.status !== "active" && canManage && canEdit && (
        <section className="card next-step" aria-label="Próximo passo">
          <span className="next-step-mark" aria-hidden="true">
            {step + 1}
          </span>
          <div>
            <strong>{nextStepTitle[step] ?? "Continue a configuração"}</strong>
            <p className="form-hint">{nextStepText[step]}</p>
            {endpoint.status === "suspended" && !test && (
              <p className="form-hint">
                O webhook está suspenso. Envie um novo teste antes de ativá-lo.
              </p>
            )}
            {testResult}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-md"
            disabled={busy}
            onClick={onContinue}
          >
            Continuar configuração
          </button>
        </section>
      )}
      {canManage && canEdit && (
        <div>
          <button
            type="button"
            className="btn btn-ghost-danger btn-sm"
            onClick={onRemove}
          >
            Remover destino
          </button>
        </div>
      )}
    </>
  );
}
