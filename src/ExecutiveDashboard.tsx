import { useEffect, useState } from "react";
import { ApiError, getDashboardMetrics, type DashboardMetrics } from "./api";
import { Sparkline } from "./ExecutiveCharts";
import {
  download,
  type Breakdown,
  type TrendMetric,
} from "./executive-dashboard-model";
import { exportFilename, toCsv } from "./executive-export";
import { PRESETS, conversionSteps, kpiCards, rateBps } from "./executive-model";
import { SECTION_LABELS } from "./executive-api";
import { useExecutiveReports } from "./useExecutiveReports";
import { Attention, type DashboardPageProps } from "./DashboardOverview";
import { Delta } from "./ExecutiveParts";
import { ExecutiveLiveStatus } from "./ExecutiveLiveStatus";
import { ExecutiveRevenueSections } from "./ExecutiveRevenueSections";
import {
  ExecutiveFunnelSections,
  ExecutivePartnerSections,
} from "./ExecutiveSourceSections";
import {
  ExecutiveFulfillmentSection,
  ExecutiveHealthSections,
} from "./ExecutiveOperationsSections";
import "./executive.css";

export function ExecutiveDashboard({
  onUnauthorized,
  navigate,
}: {
  onUnauthorized: () => void;
  navigate: DashboardPageProps["navigate"];
}) {
  const [days, setDays] = useState<number>(30);
  const [compare, setCompare] = useState(true);
  const [breakdown, setBreakdown] = useState<Breakdown>("by_channel");
  const [metric, setMetric] = useState<TrendMetric>("gross");
  const [live, setLive] = useState<DashboardMetrics | null>(null);
  const [liveFailed, setLiveFailed] = useState(false);

  const reports = useExecutiveReports(days, compare, onUnauthorized);
  const { period, failed } = reports;

  useEffect(() => {
    let alive = true;
    getDashboardMetrics()
      .then((result) => alive && setLive(result))
      .catch((cause: unknown) => {
        if (!alive) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setLiveFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [onUnauthorized]);

  const { data } = reports;
  if (!data)
    return (
      <div className="page xe">
        <header className="page-header xe-header">
          <div>
            <h1 className="page-title">Painel executivo</h1>
            <p className="page-subtitle">
              Receita, margem, funil e operação da Aferis AI. Dias contados em
              horário de Brasília.
            </p>
          </div>
        </header>
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando indicadores"
        >
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </div>
    );
  const { revenue } = data;
  const steps = conversionSteps(data.funnel);
  const paidRatio = rateBps(
    steps.find((s) => s.key === "paid")?.count ?? 0,
    steps[0]?.count ?? 0,
  );
  const completedAi = data.fulfillment.groups.find((g) => g.key === "analysis");
  const cards = kpiCards({
    revenue: revenue.totals,
    previous: revenue.previous,
    paidRatioBps: paidRatio,
    medianSeconds: completedAi?.p50_seconds ?? null,
    owedCents: data.commissions.totals.owed_cents,
  });
  const sparkFor = (id: string) =>
    id === "gross"
      ? revenue.series.map((d) => d.gross_cents)
      : id === "paid"
        ? revenue.series.map((d) => d.intents)
        : id === "margin"
          ? revenue.series.map((d) =>
              d.gross_cents ? d.contribution_cents / d.gross_cents : 0,
            )
          : null;

  return (
    <div className="page xe">
      <header className="page-header xe-header">
        <div>
          <h1 className="page-title">Painel executivo</h1>
          <p className="page-subtitle">
            Receita, margem, funil e operação da Aferis AI. Dias contados em
            horário de Brasília.
          </p>
        </div>
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
                exportFilename(period, false),
                toCsv(data, period, false),
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
      </header>

      {failed.length > 0 && (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar:{" "}
          {failed.map((key) => SECTION_LABELS[key]).join(", ")}. Os blocos
          afetados aparecem zerados.{" "}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={reports.reload}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <ExecutiveLiveStatus live={live} liveFailed={liveFailed} />

      {live && (
        <Attention data={live} role="administrator" navigate={navigate} />
      )}

      <section aria-label="Indicadores principais">
        <dl className="xe-kpis">
          {cards.map((card) => {
            const spark = sparkFor(card.id);
            return (
              <div className="xe-kpi" key={card.id}>
                <dt>{card.label}</dt>
                <dd>{card.value}</dd>
                <div className="xe-kpi-foot">
                  <Delta bps={compare ? card.deltaBps : null} />
                  {spark && <Sparkline values={spark} />}
                </div>
                <small>{card.hint}</small>
              </div>
            );
          })}
        </dl>
        <p className="xe-note">
          Receita é o que foi pago no período; a margem vem da cotação, não do
          custo realizado.
        </p>
      </section>

      <ExecutiveRevenueSections
        revenue={revenue}
        metric={metric}
        onMetric={setMetric}
      />

      <ExecutiveFunnelSections
        revenue={revenue}
        steps={steps}
        breakdown={breakdown}
        onBreakdown={setBreakdown}
      />

      <ExecutivePartnerSections data={data} />

      <ExecutiveFulfillmentSection data={data} />

      <ExecutiveHealthSections data={data} />
    </div>
  );
}
