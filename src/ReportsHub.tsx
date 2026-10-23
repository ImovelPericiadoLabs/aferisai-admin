import { useMemo, useState } from "react";
import { DashboardReports } from "./DashboardOverview";
import type { TeamMember } from "./api";
import { FunnelChart, RankedBars, TrendChart } from "./ExecutiveCharts";
import {
  PRESETS,
  conversionSteps,
  formatBRL,
  formatCompactBRL,
  periodFor,
} from "./executive-model";
import { buildSampleReports, SAMPLE_LABEL } from "./executive-sample";
import {
  REPORTS,
  cellText,
  reportFilename,
  reportTables,
  tablesToCsv,
  type ReportId,
  type Table,
} from "./report-tables";
import { TabBar } from "./TabBar";
import "./executive.css";

type Props = {
  role: TeamMember["role"];
  navigate: (page: never) => void;
};

type TabId = ReportId | "volume";

function download(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ReportTable({ table }: { table: Table }) {
  return (
    <section className="rp-table-block" aria-labelledby={`rp-${table.id}`}>
      <div className="rp-table-head">
        <h3 className="xe-h3" id={`rp-${table.id}`}>
          {table.title}
        </h3>
        {table.note && <p className="xe-note">{table.note}</p>}
      </div>
      <div className="data-table-wrap rp-scroll">
        <table
          className="data-table xe-table rp-table"
          aria-label={table.title}
        >
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={column.align === "right" ? "rp-num" : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => {
                  const column = table.columns[cellIndex];
                  const first = cellIndex === 0;
                  const className = [
                    column.align === "right" ? "rp-num" : "",
                    first ? "xe-title-cell" : "",
                    column.label === "#" ? "xe-rank-cell" : "",
                    cell.t === "delta" && cell.v !== null
                      ? cell.v >= 0
                        ? "rp-up"
                        : "rp-down"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <td
                      key={cellIndex}
                      data-label={column.label}
                      className={className || undefined}
                    >
                      {cellText(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReportsHub({ role, navigate }: Props) {
  const [tab, setTab] = useState<TabId>("financeiro");
  const [days, setDays] = useState<number>(30);
  const [compare, setCompare] = useState(true);
  const period = useMemo(() => periodFor(days), [days]);
  const data = useMemo(
    () => buildSampleReports(period, compare),
    [period, compare],
  );

  // Revenue, funnel and costs have no backend source yet, so only the real counts are shown
  // to the roles that cannot see the executive numbers.
  if (role !== "administrator")
    return <DashboardReports role={role} navigate={navigate as never} />;

  const tabs = [
    ...REPORTS.map((r) => ({ id: r.id, label: r.label, icon: r.icon })),
    { id: "volume", label: "Volume (dados reais)", icon: "history" },
  ];
  const current = REPORTS.find((r) => r.id === tab);
  const tables = current ? reportTables(current.id, data, period) : [];
  const { revenue } = data;

  return (
    <div className="page xe">
      <header className="page-header xe-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">
            Relatórios detalhados por tema, com tabelas, exportação e impressão.
          </p>
        </div>
        {current && (
          <div className="xe-actions">
            <div className="seg" role="group" aria-label="Período">
              {PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="seg-item"
                  aria-pressed={days === value}
                  onClick={() => setDays(value)}
                >
                  {value} dias
                </button>
              ))}
            </div>
            <label className="xe-compare">
              <input
                type="checkbox"
                checked={compare}
                onChange={(event) => setCompare(event.target.checked)}
              />
              Comparar com o período anterior
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() =>
                download(
                  reportFilename(current.id, period, true),
                  tablesToCsv(current.label, tables, period, true),
                )
              }
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => window.print()}
            >
              Imprimir
            </button>
          </div>
        )}
      </header>

      <TabBar
        tabs={tabs}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        label="Relatórios"
        idBase="reports"
        panelId="reports-panel"
      />

      <div
        id="reports-panel"
        role="tabpanel"
        aria-labelledby={`reports-tab-${tab}`}
        className="rp-panel"
      >
        {current ? (
          <>
            <div className="alert alert-warning" role="note">
              <strong>{SAMPLE_LABEL}.</strong> {current.description} O backend
              ainda não tem as rotas deste relatório (pedido 006); os números
              são de exemplo até elas existirem. Período:{" "}
              {period.from.split("-").reverse().join("/")} a{" "}
              {period.to.split("-").reverse().join("/")}.
            </div>

            {current.id === "financeiro" && (
              <section className="card xe-section" aria-labelledby="rp-chart">
                <h2 className="card-title" id="rp-chart">
                  Evolução da receita bruta
                </h2>
                <TrendChart
                  label="Receita bruta por dia"
                  current={revenue.series.map((d) => ({
                    date: d.date,
                    value: d.gross_cents,
                  }))}
                  previous={revenue.previous_series?.map((d, index) => ({
                    date: revenue.series[index]?.date ?? d.date,
                    value: d.gross_cents,
                  }))}
                  format={formatBRL}
                  formatAxis={formatCompactBRL}
                />
              </section>
            )}
            {current.id === "funil" && (
              <section className="card xe-section" aria-labelledby="rp-chart">
                <h2 className="card-title" id="rp-chart">
                  Do pedido à entrega
                </h2>
                <FunnelChart rows={conversionSteps(data.funnel)} />
              </section>
            )}
            {current.id === "parceiros" && (
              <section className="card xe-section" aria-labelledby="rp-chart">
                <h2 className="card-title" id="rp-chart">
                  Maiores receitas por parceiro
                </h2>
                <RankedBars
                  label="Receita por parceiro"
                  rows={revenue.top_organizations.slice(0, 5).map((o) => ({
                    key: o.organization_id,
                    label: o.name,
                    value: o.gross_cents,
                    display: formatBRL(o.gross_cents),
                  }))}
                />
              </section>
            )}

            {tables.map((table) => (
              <div className="card xe-section" key={table.id}>
                <ReportTable table={table} />
              </div>
            ))}
          </>
        ) : (
          <DashboardReports role={role} navigate={navigate as never} embedded />
        )}
      </div>
    </div>
  );
}
