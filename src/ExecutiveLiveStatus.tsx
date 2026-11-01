import type { DashboardMetrics } from "./api";
import { number } from "./executive-dashboard-model";

export function ExecutiveLiveStatus({
  live,
  liveFailed,
}: {
  live: DashboardMetrics | null;
  liveFailed: boolean;
}) {
  return (
    <section className="xe-live card" aria-labelledby="xe-live-title">
      <div className="xe-section-head">
        <div>
          <h2 className="card-title" id="xe-live-title">
            Situação agora
          </h2>
          <p className="xe-sub">
            Contagens atuais por estado, sem filtro de período.
          </p>
        </div>
        <span className="badge badge-success">Dados reais</span>
      </div>
      {liveFailed ? (
        <p className="xe-sub" role="status">
          Não foi possível carregar as contagens agora.
        </p>
      ) : !live ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          <span className="skeleton" />
        </div>
      ) : (
        <dl className="xe-live-grid">
          {live.analyses && (
            <>
              <div>
                <dt>Análises concluídas</dt>
                <dd>{number.format(live.analyses.completed)}</dd>
              </div>
              <div data-tone={live.analyses.error ? "danger" : undefined}>
                <dt>Análises com erro</dt>
                <dd>{number.format(live.analyses.error)}</dd>
              </div>
              <div>
                <dt>Na fila ou em execução</dt>
                <dd>
                  {number.format(live.analyses.queued + live.analyses.running)}
                </dd>
              </div>
            </>
          )}
          {live.payments && (
            <>
              <div>
                <dt>Pagamentos recebidos</dt>
                <dd>{number.format(live.payments.received)}</dd>
              </div>
              <div data-tone={live.payments.review ? "warning" : undefined}>
                <dt>Pagamentos em revisão</dt>
                <dd>{number.format(live.payments.review)}</dd>
              </div>
            </>
          )}
          {live.registry_requests && (
            <div>
              <dt>Pedidos registrais confirmados</dt>
              <dd>{number.format(live.registry_requests.confirmed)}</dd>
            </div>
          )}
          {live.commissions && (
            <div>
              <dt>Comissões a repassar</dt>
              <dd>{number.format(live.commissions.owed)}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
