import type { OperationsOverview } from "./api";
import { date, money } from "./operations-format";

export function OperationsHourlyChart({
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
