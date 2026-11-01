import { RankedBars, TrendChart } from "./ExecutiveCharts";
import type { RevenueReport } from "./executive-contract";
import type { TrendMetric } from "./executive-dashboard-model";
import {
  formatBRL,
  formatCompactBRL,
  formatPercentBps,
  marginBps,
  rateBps,
} from "./executive-model";
import { Section } from "./ExecutiveParts";

export function ExecutiveRevenueSections({
  revenue,
  metric,
  onMetric,
}: {
  revenue: RevenueReport;
  metric: TrendMetric;
  onMetric: (metric: TrendMetric) => void;
}) {
  const t = revenue.totals;
  const deductions = [
    {
      key: "tax",
      label: "Impostos",
      value: t.tax_cents,
      tone: "warning" as const,
    },
    {
      key: "fees",
      label: "Taxas de pagamento",
      value: t.fees_cents,
      tone: "info" as const,
    },
    {
      key: "commission",
      label: "Comissões de parceiros",
      value: t.commission_cents,
      tone: "info" as const,
    },
    {
      key: "refund",
      label: "Estornos",
      value: t.refund_cents,
      tone: "danger" as const,
    },
  ];
  return (
    <div className="xe-grid-2">
      <Section
        id="xe-trend"
        title="Evolução da receita"
        description="Por dia, em horário de Brasília."
      >
        <div className="seg" role="group" aria-label="Métrica do gráfico">
          <button
            type="button"
            className="seg-item"
            aria-pressed={metric === "gross"}
            onClick={() => onMetric("gross")}
          >
            Receita bruta
          </button>
          <button
            type="button"
            className="seg-item"
            aria-pressed={metric === "contribution"}
            onClick={() => onMetric("contribution")}
          >
            Margem de contribuição
          </button>
        </div>
        <TrendChart
          label={`${metric === "gross" ? "Receita bruta" : "Margem de contribuição"} por dia`}
          current={revenue.series.map((d) => ({
            date: d.date,
            value: metric === "gross" ? d.gross_cents : d.contribution_cents,
          }))}
          previous={revenue.previous_series?.map((d, index) => ({
            date: revenue.series[index]?.date ?? d.date,
            value: metric === "gross" ? d.gross_cents : d.contribution_cents,
          }))}
          format={formatBRL}
          formatAxis={formatCompactBRL}
        />
        <details className="xe-table-toggle">
          <summary>Ver dados em tabela</summary>
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Receita por dia">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Receita bruta</th>
                  <th scope="col">Margem</th>
                  <th scope="col">Pagamentos</th>
                </tr>
              </thead>
              <tbody>
                {revenue.series.map((d) => (
                  <tr key={d.date}>
                    <td data-label="Data">
                      {d.date.split("-").reverse().join("/")}
                    </td>
                    <td data-label="Receita bruta">
                      {formatBRL(d.gross_cents)}
                    </td>
                    <td data-label="Margem">
                      {formatBRL(d.contribution_cents)}
                    </td>
                    <td data-label="Pagamentos">{d.intents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>

      <Section
        id="xe-net"
        title="Da receita bruta à líquida"
        description="Para onde vai cada real recebido."
      >
        <div className="xe-waterfall">
          <div className="xe-waterfall-total">
            <span>Receita bruta</span>
            <strong>{formatBRL(t.gross_cents)}</strong>
          </div>
          <RankedBars
            label="Deduções da receita bruta"
            rows={deductions.map((d) => ({
              key: d.key,
              label: d.label,
              value: d.value,
              display: `− ${formatBRL(d.value)}`,
              hint: `${formatPercentBps(rateBps(d.value, t.gross_cents) ?? 0)} da bruta`,
            }))}
            tone="warning"
            shareOf="das deduções"
          />
          <div className="xe-waterfall-total xe-waterfall-net">
            <span>Receita líquida</span>
            <strong>{formatBRL(t.net_cents)}</strong>
          </div>
          <p className="xe-note">
            Margem de contribuição:{" "}
            <strong>{formatPercentBps(marginBps(t) ?? 0)}</strong> (
            {formatBRL(t.contribution_cents)}). Ela já desconta o custo de
            fornecedor e de IA previsto na cotação.
          </p>
        </div>
      </Section>
    </div>
  );
}
