import { deliveryLabel, deliveryTone, eventLabel } from "./delivery-labels";
import {
  integrationReadiness,
  relativeTime,
} from "./integration-insights-model";
import {
  summarizeCredentials,
  summarizeEndpoint,
} from "./application-overview-model";
import { IntegrationIcon } from "./IntegrationIcon";
import { ReadinessRing } from "./ReadinessRing";
import type { ApplicationSnapshot } from "./useApplicationSnapshot";

type Tab = "webhooks" | "deliveries" | "credentials" | "access";

export function ApplicationOverview({
  snapshot,
  failed,
  grantedCount,
  totalPermissions,
  onOpen,
}: {
  snapshot: ApplicationSnapshot | null;
  failed: boolean;
  grantedCount: number;
  totalPermissions: number;
  onOpen: (tab: Tab) => void;
}) {
  if (failed)
    return (
      <div className="alert alert-danger" role="alert">
        Não foi possível carregar o resumo da integração. Use as abas para
        consultar cada área.
      </div>
    );
  if (!snapshot)
    return (
      <div className="rules-skeleton" role="status" aria-label="Carregando">
        {Array.from({ length: 4 }, (_, index) => (
          <span className="skeleton" key={index} />
        ))}
      </div>
    );

  const readiness = integrationReadiness({
    endpoint: snapshot.endpoint,
    credentials: snapshot.credentials,
    deliveries: snapshot.deliveries,
    grantedCount,
  });
  const doneCount = readiness.steps.filter((step) => step.done).length;
  const endpoint = summarizeEndpoint(snapshot.endpoint);
  const credentials = summarizeCredentials(snapshot.credentials);
  const recent = snapshot.deliveries.slice(0, 5);

  return (
    <div className="ov">
      <section className="ov-ready card" aria-labelledby="ov-ready-title">
        <ReadinessRing percent={readiness.percent} />
        <div className="ov-ready-body">
          <h3 id="ov-ready-title">Prontidão da integração</h3>
          <p className="form-hint">
            {readiness.next
              ? `${doneCount} de ${readiness.steps.length} etapas concluídas.`
              : "Tudo configurado. A integração está pronta para receber eventos."}
          </p>
          <ul className="ov-steps">
            {readiness.steps.map((step) => (
              <li key={step.id} data-done={step.done}>
                <span className="ov-step-mark" aria-hidden="true">
                  {step.done ? (
                    <IntegrationIcon name="check" size={14} />
                  ) : null}
                </span>
                <span>
                  <strong>{step.label}</strong>
                  {!step.done && <small>{step.hint}</small>}
                </span>
                {readiness.next?.id === step.id && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onOpen(step.tab)}
                  >
                    Resolver
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ov-activity card" aria-labelledby="ov-activity-title">
        <header>
          <h3 id="ov-activity-title">Atividade recente</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onOpen("deliveries")}
          >
            Ver entregas
          </button>
        </header>
        {recent.length === 0 ? (
          <div className="empty-state" role="status">
            <strong>Nenhuma entrega ainda</strong>
            <span>
              Os eventos enviados aparecem aqui, do mais recente ao mais antigo.
            </span>
          </div>
        ) : (
          <ol className="ov-timeline">
            {recent.map((item) => (
              <li key={item.id} data-tone={deliveryTone(item.status)}>
                <span className="ov-dot" aria-hidden="true" />
                <div>
                  <strong>{eventLabel(item.event_type)}</strong>
                  <small>
                    {deliveryLabel(item.status)}
                    {item.http_status ? ` · HTTP ${item.http_status}` : ""}
                    {item.duration_ms != null
                      ? ` · ${item.duration_ms} ms`
                      : ""}
                  </small>
                </div>
                <time dateTime={item.created_at}>
                  {relativeTime(item.created_at)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="ov-facts">
        <button
          type="button"
          className="ov-fact"
          onClick={() => onOpen("webhooks")}
        >
          <span className="ov-fact-icon">
            <IntegrationIcon name="webhook" />
          </span>
          <span>
            <small>Webhook</small>
            <strong>{endpoint.label}</strong>
            <em>{endpoint.detail}</em>
          </span>
          <IntegrationIcon name="arrow" size={16} />
        </button>
        <button
          type="button"
          className="ov-fact"
          onClick={() => onOpen("credentials")}
        >
          <span className="ov-fact-icon">
            <IntegrationIcon name="key" />
          </span>
          <span>
            <small>Credenciais</small>
            <strong>{credentials.label}</strong>
            <em>
              {credentials.revoked > 0
                ? `${credentials.revoked} revogada${credentials.revoked > 1 ? "s" : ""}`
                : "Até 2 ativas ao mesmo tempo"}
            </em>
          </span>
          <IntegrationIcon name="arrow" size={16} />
        </button>
        <button
          type="button"
          className="ov-fact"
          onClick={() => onOpen("access")}
        >
          <span className="ov-fact-icon">
            <IntegrationIcon name="shield" />
          </span>
          <span>
            <small>Permissões</small>
            <strong>
              {grantedCount} de {totalPermissions} concedidas
            </strong>
            <em>Ações que a aplicação pode executar</em>
          </span>
          <IntegrationIcon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}
