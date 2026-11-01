import { useState } from "react";
import { CombinedSeriesChart } from "./dashboard-series";
import {
  useDashboardSeries,
  utcPreset,
  type DashboardRange,
} from "./dashboard-series-data";
import { DashboardVolumeChart } from "./dashboard-volume";
import { groupsForRole } from "./dashboard-model";
import { useDashboardData, type DashboardPageProps } from "./dashboard-data";
import { Icon } from "./DashboardIcon";
import { LoadingState, MessageState, PageIntro } from "./DashboardStates";
import { ReportChart } from "./DashboardReportChart";
import "./dashboard.css";

export function DashboardReports({
  role,
  navigate,
  embedded = false,
}: DashboardPageProps & { embedded?: boolean }) {
  const { data, fetchedAt, loading, error, refresh } = useDashboardData();
  const groups = data ? groupsForRole(data, role) : [];
  const [preset, setPreset] = useState<7 | 30 | 90 | "custom">(30);
  const [range, setRange] = useState<DashboardRange>(() => utcPreset(30));
  const [draftStart, setDraftStart] = useState(range.start);
  const [draftEnd, setDraftEnd] = useState(range.end);
  const [rangeError, setRangeError] = useState("");
  const [compare, setCompare] = useState(true);
  const daily = useDashboardSeries(range, compare);
  function choosePreset(days: 7 | 30 | 90) {
    const next = utcPreset(days);
    setPreset(days);
    setRange(next);
    setDraftStart(next.start);
    setDraftEnd(next.end);
    setRangeError("");
  }
  function applyCustom() {
    const days =
      Math.round((Date.parse(draftEnd) - Date.parse(draftStart)) / 86400000) +
      1;
    if (
      !draftStart ||
      !draftEnd ||
      !Number.isFinite(days) ||
      days < 1 ||
      days > 90
    ) {
      setRangeError(
        "Selecione um intervalo de 1 a 90 dias, com a data inicial antes da final.",
      );
      return;
    }
    setRange({ start: draftStart, end: draftEnd });
    setRangeError("");
  }
  return (
    <div className="dash-page">
      {!embedded && (
        <PageIntro
          title="Relatórios"
          description="Explore as contagens operacionais disponíveis para seu perfil."
          fetchedAt={fetchedAt}
          onRefresh={refresh}
          loading={loading}
        />
      )}
      <details className="dash-report-notice">
        <summary>
          <Icon name="chart" />
          <strong>Como ler os dados do painel</strong>
        </summary>
        <p>
          A linha mostra registros criados por dia UTC; a distribuição abaixo
          mostra estados atuais. Criação não indica conclusão, receita ou
          mudança de estado.
        </p>
      </details>
      <section
        className="dash-report-filters"
        aria-label="Filtro de período dos relatórios"
      >
        <div
          className="dash-period-presets"
          role="group"
          aria-label="Período rápido"
        >
          {([7, 30, 90] as const).map((days) => (
            <button
              type="button"
              key={days}
              aria-pressed={preset === days}
              onClick={() => choosePreset(days)}
            >
              {days} dias
            </button>
          ))}
          <button
            type="button"
            aria-pressed={preset === "custom"}
            onClick={() => setPreset("custom")}
          >
            Personalizar
          </button>
        </div>
        {preset === "custom" && (
          <div className="dash-custom-range">
            <label>
              Início UTC
              <input
                type="date"
                value={draftStart}
                onChange={(event) => setDraftStart(event.target.value)}
                aria-invalid={Boolean(rangeError)}
              />
            </label>
            <label>
              Fim UTC
              <input
                type="date"
                value={draftEnd}
                onChange={(event) => setDraftEnd(event.target.value)}
                aria-invalid={Boolean(rangeError)}
                aria-describedby={rangeError ? "dash-range-error" : undefined}
              />
              {rangeError && (
                <small id="dash-range-error" role="alert">
                  {rangeError}
                </small>
              )}
            </label>
            <button
              type="button"
              className="dash-apply-range"
              onClick={applyCustom}
            >
              Aplicar
            </button>
          </div>
        )}
        <label className="dash-compare-control">
          <input
            type="checkbox"
            checked={compare}
            onChange={(event) => setCompare(event.target.checked)}
          />{" "}
          Comparar com período anterior
        </label>
        <p className="dash-range-caption">
          Período exibido: {range.start.split("-").reverse().join("/")} a{" "}
          {range.end.split("-").reverse().join("/")} · UTC
        </p>
      </section>
      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <MessageState kind="error" retry={refresh} />
      ) : groups.length === 0 ? (
        <MessageState kind="empty" />
      ) : (
        <>
          <div className="dash-report-heading">
            <div>
              <p className="dash-eyebrow">DADOS DISPONÍVEIS</p>
              <h2>Evolução diária</h2>
            </div>
            <span>
              {groups.length} {groups.length === 1 ? "módulo" : "módulos"}
            </span>
          </div>
          <section
            className="dash-trend-card"
            aria-label="Comparação diária entre módulos"
          >
            {daily.loading ? (
              <div
                className="dash-series-loading"
                role="status"
                aria-label="Carregando séries diárias"
              />
            ) : daily.error ? (
              <div className="dash-series-error" role="alert">
                Não foi possível carregar as séries.
                <button type="button" onClick={daily.retry}>
                  Tentar novamente
                </button>
              </div>
            ) : (
              <CombinedSeriesChart
                groups={groups}
                response={daily.data}
                compare={compare}
              />
            )}
          </section>
          <div className="dash-analytics-grid">
            <DashboardVolumeChart groups={groups} />
          </div>
          <div className="dash-section-heading">
            <div>
              <p className="dash-eyebrow">INSTANTÂNEO</p>
              <h2>Distribuição atual por estado</h2>
            </div>
            <span>Sem filtro de período</span>
          </div>
          <div className="dash-report-grid">
            {groups.map((group) => (
              <ReportChart
                key={group.key}
                group={group}
                series={daily.data?.series[group.key]}
                compare={compare}
                seriesLoading={daily.loading}
                seriesError={daily.error}
                retry={daily.retry}
              />
            ))}
          </div>
          {!embedded && (
            <button
              className="dash-text-action"
              type="button"
              onClick={() => navigate("overview")}
            >
              <Icon name="arrow" /> Voltar à visão geral
            </button>
          )}
        </>
      )}
    </div>
  );
}
