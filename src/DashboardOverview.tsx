import { CombinedSeriesChart } from "./dashboard-series";
import { useDashboardSeries, utcPreset } from "./dashboard-series-data";
import { groupsForRole } from "./dashboard-model";
import { useDashboardData, type DashboardPageProps } from "./dashboard-data";
import { Icon } from "./DashboardIcon";
import { LoadingState, MessageState, PageIntro } from "./DashboardStates";
import { GroupCard } from "./DashboardGroupCard";
import { Attention, OverviewMetrics } from "./DashboardAttention";
import "./dashboard.css";

export type { DashboardPageProps } from "./dashboard-data";
export { Attention } from "./DashboardAttention";
export { DashboardReports } from "./DashboardReports";

export function DashboardOverview({ role, navigate }: DashboardPageProps) {
  const { data, fetchedAt, loading, error, refresh } = useDashboardData();
  const groups = data ? groupsForRole(data, role) : [];
  const trend = useDashboardSeries(utcPreset(30), true);
  return (
    <div className="dash-page">
      <PageIntro
        title="Visão geral"
        description="Acompanhe a situação atual dos fluxos sob sua responsabilidade."
        fetchedAt={fetchedAt}
        onRefresh={refresh}
        loading={loading}
      />
      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <MessageState kind="error" retry={refresh} />
      ) : groups.length === 0 ? (
        <MessageState kind="empty" />
      ) : (
        <>
          <OverviewMetrics groups={groups} />
          <Attention data={data!} role={role} navigate={navigate} />
          <section
            className="dash-trend-card"
            aria-labelledby="dash-overview-trend-title"
          >
            <h2 id="dash-overview-trend-title">Evolução dos registros</h2>
            <p className="dash-trend-sub">
              Criações diárias nos últimos 30 dias (UTC), comparadas ao período
              anterior de mesma duração.
            </p>
            {trend.loading ? (
              <div
                className="dash-series-loading"
                role="status"
                aria-label="Carregando evolução diária"
              />
            ) : trend.error ? (
              <div className="dash-series-error" role="alert">
                Não foi possível carregar a evolução.
                <button type="button" onClick={trend.retry}>
                  Tentar novamente
                </button>
              </div>
            ) : (
              <CombinedSeriesChart
                groups={groups}
                response={trend.data}
                compare={true}
              />
            )}
          </section>
          <div className="dash-section-heading">
            <h2>Situação dos módulos</h2>
            <span>Estados atuais e criações nos últimos 30 dias</span>
          </div>
          <div className="dash-groups">
            {groups.map((group) => (
              <GroupCard
                key={group.key}
                group={group}
                navigate={navigate}
                series={trend.data?.series[group.key]}
                seriesLoading={trend.loading}
                seriesError={trend.error}
              />
            ))}
          </div>
          <button
            className="dash-reports-link"
            type="button"
            onClick={() => navigate("reports")}
          >
            <span className="dash-reports-icon">
              <Icon name="chart" />
            </span>
            <span>
              <strong>Biblioteca de relatórios</strong>
              <small>
                Veja a distribuição das contagens disponíveis para seu perfil.
              </small>
            </span>
            <Icon name="arrow" />
          </button>
        </>
      )}
    </div>
  );
}
