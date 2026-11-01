import { groupSum, type DashboardGroup } from "./dashboard-model";
import type { DashboardPageProps } from "./dashboard-data";
import { Icon } from "./DashboardIcon";

function StatusPill({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="dash-status">
      <span className={`dash-status-dot dash-tone-${tone}`} />
      <span>{label}</span>
      <strong>{value.toLocaleString("pt-BR")}</strong>
    </div>
  );
}

export function GroupCard({
  group,
  navigate,
  series,
  seriesLoading,
  seriesError,
}: {
  group: DashboardGroup;
  navigate: DashboardPageProps["navigate"];
  series?: import("./api").DashboardDailySeries;
  seriesLoading: boolean;
  seriesError: boolean;
}) {
  const sum = groupSum(group);
  const days = series?.current ?? [];
  const maxDay = Math.max(1, ...days.map((day) => day.count));
  const hasActivity = days.some((day) => day.count > 0);
  return (
    <article className="dash-group-card">
      <div className="dash-card-head">
        <span className={`dash-card-icon dash-card-icon-${group.icon}`}>
          <Icon name={group.icon} />
        </span>
        <div>
          <h2>{group.title}</h2>
          <p>{group.description}</p>
        </div>
        <span className="dash-card-total">{sum.toLocaleString("pt-BR")}</span>
        <details className="dash-card-definition">
          <summary
            aria-label={`Como ler ${group.title}`}
            title="Como ler esta métrica"
          >
            <Icon name="info" />
          </summary>
          <p>{group.definition}</p>
        </details>
      </div>
      <div className="dash-card-trend">
        <div className="dash-card-trend-heading">
          <span>Criações por dia</span>
          <small>Últimos 30 dias · UTC</small>
        </div>
        {seriesLoading ? (
          <div className="dash-card-trend-empty" role="status">
            Carregando série diária…
          </div>
        ) : seriesError ? (
          <p className="dash-card-trend-empty">
            Não foi possível carregar a série
          </p>
        ) : hasActivity ? (
          <div
            className="dash-card-trend-bars"
            role="img"
            aria-label={`${group.title}: ${days.map((day) => `${day.date}, ${day.count} registros criados`).join("; ")}`}
          >
            {days.map((day) => (
              <span
                key={day.date}
                style={{
                  height: `${Math.max(4, (day.count / maxDay) * 100)}%`,
                }}
                title={`${day.date}: ${day.count.toLocaleString("pt-BR")}`}
              />
            ))}
          </div>
        ) : (
          <p className="dash-card-trend-empty">
            {days.length
              ? "Sem criações no período"
              : "Série diária indisponível"}
          </p>
        )}
      </div>
      {sum > 0 && (
        <div
          className="dash-card-distribution"
          role="img"
          aria-label={`Distribuição de ${group.title.toLowerCase()}: ${group.items.map((item) => `${item.label}, ${item.value}`).join("; ")}`}
        >
          {group.items.map((item) => (
            <span
              key={item.label}
              className={`dash-tone-${item.tone}`}
              style={{ width: `${(item.value / sum) * 100}%` }}
              title={`${item.label}: ${item.value.toLocaleString("pt-BR")}`}
            />
          ))}
        </div>
      )}
      <div className="dash-status-list">
        {group.items.map((item) => (
          <StatusPill key={item.label} {...item} />
        ))}
      </div>
      {group.destination && (
        <button
          className="dash-card-action"
          type="button"
          onClick={() => navigate(group.destination!)}
        >
          Abrir módulo <Icon name="arrow" />
        </button>
      )}
    </article>
  );
}
