import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getOperationsOverview,
  type OperationsOverview,
} from "./api";
import "./operations-dashboard.css";

const stateLabel: Record<
  OperationsOverview["services"][number]["state"],
  string
> = {
  operational: "Operacional",
  degraded: "Instável",
  unavailable: "Indisponível",
  unverified: "Sem verificação recente",
};

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

function HourlyChart({
  rows,
}: {
  rows: OperationsOverview["hourly_capacity"];
}) {
  const max = Math.max(1, ...rows.map((row) => row.calls + row.waits));
  const total = rows.reduce((sum, row) => sum + row.calls, 0);
  return (
    <section className="ops-section" aria-labelledby="ops-activity-title">
      <div className="ops-section-heading">
        <div>
          <h2 id="ops-activity-title">Atividade da IA</h2>
          <p>
            Chamadas e esperas por hora nas últimas 24 horas · horário de
            Brasília
          </p>
        </div>
        <strong>{total.toLocaleString("pt-BR")} chamadas</strong>
      </div>
      <div
        className="ops-chart"
        role="img"
        aria-label={`Nas últimas 24 horas, ${total} chamadas. A tabela seguinte detalha cada hora.`}
      >
        {rows.map((row) => (
          <div
            className="ops-hour"
            key={row.hour}
            title={`${date(row.hour)} · ${row.calls} chamadas · ${row.waits} esperas · ${money(row.cost_cents)}`}
          >
            <span
              className="ops-hour-waits"
              style={{ height: `${Math.max(0, (row.waits / max) * 100)}%` }}
            />
            <span
              className="ops-hour-calls"
              style={{ height: `${Math.max(0, (row.calls / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="ops-legend">
        <span>
          <i className="ops-key ops-key-calls" /> Chamadas
        </span>
        <span>
          <i className="ops-key ops-key-waits" /> Esperas
        </span>
      </div>
      <details className="ops-details">
        <summary>Ver dados por hora</summary>
        <div className="ops-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Chamadas</th>
                <th>Esperas</th>
                <th>Incertas</th>
                <th>Custo ou reserva</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.hour}>
                  <th scope="row">{date(row.hour)}</th>
                  <td>{row.calls}</td>
                  <td>{row.waits}</td>
                  <td>{row.unknown}</td>
                  <td>{money(row.cost_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

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
          <HourlyChart rows={data.hourly_capacity} />
          <section className="ops-section" aria-labelledby="ops-pools-title">
            <div className="ops-section-heading">
              <div>
                <h2 id="ops-pools-title">Capacidade compartilhada</h2>
                <p>
                  Limites observados, uso atual e reservas para outros projetos.
                </p>
              </div>
            </div>
            {data.pools.length === 0 ? (
              <p>Não há grupos de capacidade cadastrados.</p>
            ) : (
              <div className="ops-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Limite</th>
                      <th>Reservado fora</th>
                      <th>Em andamento</th>
                      <th>Disponível</th>
                      <th>Esperas 24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pools.map((pool) => (
                      <tr key={pool.pool_key}>
                        <th scope="row">{pool.pool_key}</th>
                        <td>{pool.observed_limit}</td>
                        <td>{pool.external_reserved}</td>
                        <td>
                          {pool.in_flight}
                          {pool.unknown > 0 && (
                            <small> · {pool.unknown} incerta(s)</small>
                          )}
                        </td>
                        <td>{pool.available}</td>
                        <td>{pool.waits_in_window}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="ops-section" aria-labelledby="ops-accounts-title">
            <div className="ops-section-heading">
              <div>
                <h2 id="ops-accounts-title">Contas de análise</h2>
                <p>
                  O custo inclui valor apurado e reserva de chamadas ainda
                  abertas.
                </p>
              </div>
            </div>
            {data.accounts.length === 0 ? (
              <p>Não há contas cadastradas.</p>
            ) : (
              <div className="ops-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Conta e modelo</th>
                      <th>Estado</th>
                      <th>Chamadas hoje</th>
                      <th>Teto diário</th>
                      <th>Custo ou reserva hoje</th>
                      <th>Teto de custo</th>
                      <th>Esperas 24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.map((account) => (
                      <tr key={account.account_id}>
                        <th scope="row">
                          {account.label}
                          <small>{account.model}</small>
                        </th>
                        <td>{account.status}</td>
                        <td>
                          {account.calls_today}
                          {account.unpriced_calls_today > 0 && (
                            <small>
                              {" "}
                              · {account.unpriced_calls_today} sem preço
                            </small>
                          )}
                        </td>
                        <td>{account.daily_limit}</td>
                        <td>{money(account.cost_cents_today)}</td>
                        <td>{money(account.daily_cost_limit_cents)}</td>
                        <td>{account.waits_in_window}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="ops-section" aria-labelledby="ops-errors-title">
            <div className="ops-section-heading">
              <div>
                <h2 id="ops-errors-title">Erros de IA</h2>
                <p>
                  Códigos seguros das últimas 24 horas, sem resposta bruta nem
                  documento de cliente.
                </p>
              </div>
            </div>
            {data.provider_errors.length === 0 ? (
              <p>Não houve erro de provedor registrado na janela.</p>
            ) : (
              <div className="ops-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Ocorrências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.provider_errors.map((item) => (
                      <tr key={item.code}>
                        <th scope="row">
                          <code>{item.code}</code>
                        </th>
                        <td>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
