import { type DashboardDailySeries, type DashboardSeriesResponse } from "./api";
import type { DashboardGroup, DashboardGroupKey } from "./dashboard-model";
import { MultiTrendChart, type MultiSeries } from "./ExecutiveCharts";
import "./dashboard-series.css";

const COLORS: Record<DashboardGroupKey, string> = {
  analyses: "var(--primary)",
  registry_requests: "var(--info)",
  payments: "var(--warning)",
  commissions: "var(--success)",
};

const count = (value: number) => value.toLocaleString("pt-BR");
const axis = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toLocaleString("pt-BR")} mil`
    : String(value);

const fullDay = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const UNIT = "Unidade: registros criados por dia UTC.";

function toSeries(
  key: string,
  label: string,
  color: string,
  series: DashboardDailySeries,
): MultiSeries {
  return {
    key,
    label,
    color,
    current: series.current.map((d) => ({ date: d.date, value: d.count })),
    previous: series.previous?.map((d, index) => ({
      date: series.current[index]?.date ?? d.date,
      value: d.count,
    })),
  };
}

/** Daily creation counts as an accessible table, the alternative to reading the chart. */
function SeriesTable({
  caption,
  columns,
}: {
  caption: string;
  columns: { label: string; series: DashboardDailySeries; compare: boolean }[];
}) {
  const days = columns[0]?.series.current ?? [];
  return (
    <details className="dash-series-table">
      <summary>Ver série diária em tabela</summary>
      <div>
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Dia</th>
              {columns.map((column) => (
                <th scope="col" key={column.label}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, index) => (
              <tr key={day.date}>
                <th scope="row">{fullDay(day.date)}</th>
                {columns.map((column) => (
                  <td key={column.label}>
                    {count(column.series.current[index]?.count ?? 0)}
                    {column.compare && column.series.previous?.[index] && (
                      <small>
                        {" "}
                        (anterior {count(column.series.previous[index].count)})
                      </small>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function SeriesChart({
  title,
  series,
  compare,
}: {
  title: string;
  series?: DashboardDailySeries;
  compare: boolean;
}) {
  const current = series?.current ?? [];
  if (!series || !current.length)
    return (
      <p className="dash-series-empty">
        Nenhuma série foi retornada para este período.
      </p>
    );
  const allZero =
    current.every((day) => day.count === 0) &&
    (!compare || (series.previous ?? []).every((day) => day.count === 0));
  return (
    <div className="dash-series">
      <div className="dash-series-heading">
        <div>
          <span className="dash-series-kicker">REGISTROS CRIADOS · UTC</span>
          <h3>Evolução diária</h3>
        </div>
      </div>
      <MultiTrendChart
        series={[toSeries("single", title, "var(--primary)", series)]}
        compare={compare}
        format={count}
        formatAxis={axis}
        label={`Registros criados por dia para ${title}`}
        unit={UNIT}
        integer
      />
      {allZero && (
        <p className="dash-series-empty">
          Nenhum registro criado nos períodos exibidos.
        </p>
      )}
      <SeriesTable
        caption={`${title}: registros criados por dia UTC`}
        columns={[{ label: title, series, compare }]}
      />
    </div>
  );
}

export function CombinedSeriesChart({
  groups,
  response,
  compare,
}: {
  groups: DashboardGroup[];
  response?: DashboardSeriesResponse | null;
  compare: boolean;
}) {
  const available = groups.filter(
    (group) => response?.series?.[group.key]?.current?.length,
  );
  if (!available.length)
    return (
      <p className="dash-series-empty">
        Nenhuma série autorizada está disponível para este período.
      </p>
    );
  const series = available.map((group) =>
    toSeries(
      group.key,
      group.title,
      COLORS[group.key],
      response!.series[group.key]!,
    ),
  );
  return (
    <div className="dash-master">
      <MultiTrendChart
        series={series}
        compare={compare}
        format={count}
        formatAxis={axis}
        label="Registros criados por dia nos módulos selecionados"
        unit={UNIT}
        integer
      />
      <SeriesTable
        caption="Registros criados por dia UTC"
        columns={available.map((group) => ({
          label: group.title,
          series: response!.series[group.key]!,
          compare,
        }))}
      />
      <details className="dash-definition dash-master-definition">
        <summary>Como ler esta tendência</summary>
        <p>
          Cada linha representa um módulo autorizado e pode ser ocultada pela
          legenda. Os pontos contam registros criados no dia UTC, não
          pagamentos, conclusões, mudanças de estado ou pessoas únicas. A
          comparação usa o período imediatamente anterior com a mesma duração.
        </p>
      </details>
    </div>
  );
}
