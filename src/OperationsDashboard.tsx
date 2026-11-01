import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getOperationsOverview,
  type OperationsOverview,
} from "./api";
import { date, stateLabel } from "./operations-format";
import { OperationsHourlyChart } from "./OperationsHourlyChart";
import {
  OperationsAccounts,
  OperationsPools,
  OperationsProviderErrors,
} from "./OperationsTables";
import "./operations-dashboard.css";

export function OperationsDashboard({
  onUnauthorized,
}: {
  onUnauthorized: () => void;
}) {
  const [data, setData] = useState<OperationsOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let live = true;
    const read = () => {
      void getOperationsOverview()
        .then((value) => {
          if (live) {
            setData(value);
            setError("");
            setLoading(false);
          }
        })
        .catch((cause: unknown) => {
          if (!live) return;
          if (cause instanceof ApiError && cause.status === 401)
            onUnauthorized();
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar o estado do sistema.",
          );
          setLoading(false);
        });
    };
    read();
    const timer = window.setInterval(read, 60_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [revision, onUnauthorized]);

  return (
    <section className="page ops-page" aria-labelledby="ops-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="ops-title">
            Estado do sistema
          </h1>
          <p className="page-subtitle">
            Evidência das integrações, capacidade compartilhada e custos das
            chamadas. Atualização a cada minuto.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-md"
          type="button"
          onClick={reload}
          disabled={loading}
        >
          Atualizar
        </button>
      </header>
      {error && (
        <div className="ops-alert" role="alert">
          {error}{" "}
          <button type="button" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      )}
      {loading && !data && <p role="status">Carregando observações…</p>}
      {data && (
        <>
          <p className="ops-updated">
            Observado em {date(data.checked_at)} · Estados sem observação
            recente não confirmam disponibilidade.
          </p>
          <div className="ops-summary" aria-label="Resumo de capacidade">
            <div>
              <span>Esperas pendentes</span>
              <strong>{data.pending_capacity_waits}</strong>
              <small>
                {data.oldest_pending_wait_at
                  ? `Mais antiga: ${date(data.oldest_pending_wait_at)}`
                  : "Nenhuma espera registrada"}
              </small>
            </div>
            <div>
              <span>Chamadas incertas</span>
              <strong>
                {data.pools.reduce((sum, pool) => sum + pool.unknown, 0)}
              </strong>
              <small>Exigem conciliação antes de repetir</small>
            </div>
            <div>
              <span>Erros de provedor</span>
              <strong>
                {data.provider_errors.reduce(
                  (sum, item) => sum + item.count,
                  0,
                )}
              </strong>
              <small>Últimas 24 horas</small>
            </div>
          </div>
          <section className="ops-section" aria-labelledby="ops-services-title">
            <div className="ops-section-heading">
              <div>
                <h2 id="ops-services-title">Serviços externos</h2>
                <p>Estado baseado nos resultados recentes de cada fluxo.</p>
              </div>
            </div>
            <ul className="ops-services">
              {data.services.map((service) => (
                <li key={service.code}>
                  <div>
                    <strong>{service.label}</strong>
                    <small>
                      {service.observed_at
                        ? `Última observação: ${date(service.observed_at)}`
                        : "Sem observação recente"}
                    </small>
                  </div>
                  <span className={`ops-state ops-state-${service.state}`}>
                    {stateLabel[service.state]}
                  </span>
                  {service.message && <p>{service.message}</p>}
                </li>
              ))}
            </ul>
          </section>
          <OperationsHourlyChart rows={data.hourly_capacity} />
          <OperationsPools pools={data.pools} />
          <OperationsAccounts accounts={data.accounts} />
          <OperationsProviderErrors errors={data.provider_errors} />
        </>
      )}
    </section>
  );
}
