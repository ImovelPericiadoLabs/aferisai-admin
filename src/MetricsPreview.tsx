import { useCountUp } from "./useCountUp";
import {
  SAMPLE_LABEL,
  sampleCommission,
  sampleFunnel,
  sampleKpis,
  statusText,
} from "./metrics-preview-sample";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

function Kpi({
  label,
  value,
  suffix = "",
  hint,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint: string;
}) {
  const shown = useCountUp(value);
  return (
    <div className="mp-kpi">
      <dt>{label}</dt>
      <dd>
        {Math.round(shown).toLocaleString("pt-BR")}
        {suffix}
      </dd>
      <small>{hint}</small>
    </div>
  );
}

/** Visual proposal for the partner metrics and statement. Sample data only. */
export function MetricsPreview() {
  const top = Math.max(...sampleFunnel.map((step) => step.value));
  return (
    <div className="mp">
      <div className="alert alert-warning" role="note">
        <strong>{SAMPLE_LABEL}.</strong> Esta é uma prévia do que o parceiro
        verá quando o backend gravar a origem das análises e expuser as
        métricas.
      </div>
      <dl className="mp-kpis" aria-label="Métricas de exemplo">
        {sampleKpis.map((kpi) => (
          <Kpi key={kpi.label} {...kpi} />
        ))}
      </dl>
      <div className="mp-grid">
        <section className="card mp-card" aria-labelledby="mp-funnel">
          <h3 id="mp-funnel">Conversão de cupom e link</h3>
          <ol className="mp-funnel">
            {sampleFunnel.map((step) => (
              <li key={step.label}>
                <span>{step.label}</span>
                <span className="mp-bar" aria-hidden="true">
                  <i style={{ width: `${(step.value / top) * 100}%` }} />
                </span>
                <strong>{step.value}</strong>
              </li>
            ))}
          </ol>
        </section>
        <section className="card mp-card" aria-labelledby="mp-commission">
          <h3 id="mp-commission">Extrato de comissão</h3>
          <dl className="mp-totals">
            {sampleCommission.totals.map((total) => (
              <div key={total.key} data-status={total.key}>
                <dt>{total.label}</dt>
                <dd>{money(total.cents)}</dd>
              </div>
            ))}
          </dl>
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Itens de exemplo">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Origem</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Valor</th>
                </tr>
              </thead>
              <tbody>
                {sampleCommission.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Data">{item.at}</td>
                    <td data-label="Origem">{item.kind}</td>
                    <td data-label="Estado">
                      <span
                        className={`badge ${item.status === "settled" ? "badge-success" : item.status === "reversed" ? "badge-neutral" : item.status === "owed" ? "badge-warning" : "badge-info"}`}
                      >
                        {statusText[item.status]}
                      </span>
                    </td>
                    <td data-label="Valor">{money(item.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
