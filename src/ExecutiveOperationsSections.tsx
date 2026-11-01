import type { ExecutiveReports } from "./executive-contract";
import { number } from "./executive-dashboard-model";
import {
  formatBRL,
  formatDuration,
  formatPercentBps,
  keyLabel,
  rateBps,
  successBps,
} from "./executive-model";
import { Section } from "./ExecutiveParts";

export function ExecutiveFulfillmentSection({
  data,
}: {
  data: ExecutiveReports;
}) {
  return (
    <Section
      id="xe-fulfillment"
      title="Entrega por fornecedor"
      description="Taxa de sucesso e tempo até concluir. Resultado incerto conta como não concluído."
    >
      <div className="data-table-wrap">
        <table
          className="data-table xe-table"
          aria-label="Entrega por fornecedor"
        >
          <thead>
            <tr>
              <th scope="col">Fornecedor</th>
              <th scope="col">Concluídos</th>
              <th scope="col">Falhas</th>
              <th scope="col">Incertos</th>
              <th scope="col">Sucesso</th>
              <th scope="col">Mediana</th>
              <th scope="col">P95</th>
            </tr>
          </thead>
          <tbody>
            {data.fulfillment.groups.length === 0 && (
              <tr>
                <td colSpan={7} className="xc-empty">
                  Nenhuma entrega concluída no período.
                </td>
              </tr>
            )}
            {data.fulfillment.groups.map((g) => {
              const rate = successBps(g);
              return (
                <tr key={g.key}>
                  <td data-label="Fornecedor" className="xe-title-cell">
                    {keyLabel(g.key)}
                  </td>
                  <td data-label="Concluídos">{number.format(g.completed)}</td>
                  <td data-label="Falhas">{number.format(g.failed)}</td>
                  <td data-label="Incertos">{number.format(g.unknown)}</td>
                  <td data-label="Sucesso">
                    <span
                      className={`badge ${rate !== null && rate >= 9500 ? "badge-success" : rate !== null && rate >= 9000 ? "badge-warning" : "badge-danger"}`}
                    >
                      {rate === null ? "—" : formatPercentBps(rate)}
                    </span>
                  </td>
                  <td data-label="Mediana">{formatDuration(g.p50_seconds)}</td>
                  <td data-label="P95">{formatDuration(g.p95_seconds)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function ExecutiveHealthSections({ data }: { data: ExecutiveReports }) {
  return (
    <div className="xe-grid-3">
      <Section
        id="xe-exceptions"
        title="Exceções financeiras"
        description="Casos pagos sem entrega."
      >
        <dl className="xe-stats">
          <div data-tone={data.exceptions.overdue ? "danger" : undefined}>
            <dt>Vencidas</dt>
            <dd>{data.exceptions.overdue}</dd>
          </div>
          <div>
            <dt>Abertas</dt>
            <dd>{data.exceptions.open}</dd>
          </div>
          <div>
            <dt>Vencem em 24 h</dt>
            <dd>{data.exceptions.due_in_24h}</dd>
          </div>
          <div>
            <dt>Valor em aberto</dt>
            <dd>{formatBRL(data.exceptions.amount_open_cents)}</dd>
          </div>
          <div>
            <dt>Estornado no período</dt>
            <dd>{formatBRL(data.exceptions.refunded_cents)}</dd>
          </div>
          <div>
            <dt>Tempo médio para resolver</dt>
            <dd>
              {data.exceptions.avg_resolution_hours === null
                ? "—"
                : formatDuration(data.exceptions.avg_resolution_hours * 3600)}
            </dd>
          </div>
        </dl>
      </Section>
      <Section id="xe-ai" title="Uso de IA" description="Chamadas por modelo.">
        <div className="data-table-wrap">
          <table
            className="data-table xe-table"
            aria-label="Uso de IA por modelo"
          >
            <thead>
              <tr>
                <th scope="col">Modelo</th>
                <th scope="col">Chamadas</th>
                <th scope="col">Falhas</th>
                <th scope="col">Latência</th>
              </tr>
            </thead>
            <tbody>
              {data.ai.groups.length === 0 && (
                <tr>
                  <td colSpan={4} className="xc-empty">
                    Nenhuma chamada de IA no período.
                  </td>
                </tr>
              )}
              {data.ai.groups.map((g) => (
                <tr key={g.key}>
                  <td data-label="Modelo" className="xe-title-cell">
                    {g.key}
                  </td>
                  <td data-label="Chamadas">{number.format(g.calls)}</td>
                  <td data-label="Falhas">
                    {formatPercentBps(rateBps(g.failed, g.calls) ?? 0)}
                  </td>
                  <td data-label="Latência">
                    {g.avg_latency_ms === null
                      ? "—"
                      : formatDuration(g.avg_latency_ms / 1000)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="xe-note">
          O custo em reais por chamada depende de uma decisão de preço por
          modelo.
        </p>
      </Section>
      <Section
        id="xe-webhooks"
        title="Webhooks"
        description="Entregas aos parceiros."
      >
        <dl className="xe-stats">
          <div>
            <dt>Tentativas</dt>
            <dd>{number.format(data.webhooks.attempts)}</dd>
          </div>
          <div>
            <dt>Entregues</dt>
            <dd>
              {formatPercentBps(
                rateBps(data.webhooks.delivered, data.webhooks.attempts) ?? 0,
              )}
            </dd>
          </div>
          <div>
            <dt>Latência mediana</dt>
            <dd>
              {data.webhooks.p50_ms === null
                ? "—"
                : `${data.webhooks.p50_ms} ms`}
            </dd>
          </div>
          <div>
            <dt>Latência p95</dt>
            <dd>
              {data.webhooks.p95_ms === null
                ? "—"
                : formatDuration(data.webhooks.p95_ms / 1000)}
            </dd>
          </div>
        </dl>
        <h3 className="xe-h3">Maiores taxas de falha</h3>
        {data.webhooks.worst_applications.length === 0 && (
          <p className="xc-empty" role="status">
            Nenhuma entrega com falha no período.
          </p>
        )}
        <ul className="xe-plain">
          {data.webhooks.worst_applications.map((app) => (
            <li key={app.application_id}>
              <span>{app.name}</span>
              <strong>{formatPercentBps(app.failure_rate_bps)}</strong>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
