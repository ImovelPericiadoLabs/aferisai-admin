import { SeriesChart } from "./dashboard-series";
import { groupSum, type DashboardGroup } from "./dashboard-model";
import { Icon } from "./DashboardIcon";

export function ReportChart({
  group,
  series,
  compare,
  seriesLoading,
  seriesError,
  retry,
}: {
  group: DashboardGroup;
  series?: import("./api").DashboardDailySeries;
  compare: boolean;
  seriesLoading: boolean;
  seriesError: boolean;
  retry: () => void;
}) {
  const sum = groupSum(group);
  const circumference = 2 * Math.PI * 43;
  return (
    <article className="dash-report-card">
      <header className="dash-report-head">
        <span className={`dash-card-icon dash-card-icon-${group.icon}`}>
          <Icon name={group.icon} />
        </span>
        <div>
          <h2>{group.title}</h2>
          <p>{group.description}</p>
        </div>
      </header>
      <div className="dash-report-meta">
        <span className="dash-snapshot-badge">
          <span aria-hidden="true" />
          <Icon name="chart" />
          Instantâneo
        </span>
        <span>
          <strong>{sum.toLocaleString("pt-BR")}</strong> registros nos estados
          exibidos
        </span>
      </div>
      <details className="dash-drilldown">
        <summary>Ver evolução diária deste módulo</summary>
        {seriesLoading ? (
          <div
            className="dash-series-loading"
            role="status"
            aria-label={`Carregando série de ${group.title}`}
          />
        ) : seriesError ? (
          <div className="dash-series-error" role="alert">
            Não foi possível carregar a série diária.
            <button type="button" onClick={retry}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <SeriesChart title={group.title} series={series} compare={compare} />
        )}
      </details>
      <div className="dash-snapshot-heading">
        <h3>Situação atual</h3>
        <span>Distribuição por estado · sem período</span>
      </div>
      {sum === 0 ? (
        <p className="dash-report-zero">
          Nenhum registro nos estados exibidos.
        </p>
      ) : (
        <div className="dash-report-visual">
          <svg
            className="dash-donut"
            viewBox="0 0 120 120"
            role="img"
            aria-label={`Composição atual de ${group.title.toLowerCase()}. Valores detalhados à direita e na tabela.`}
          >
            <circle
              className="dash-donut-track"
              cx="60"
              cy="60"
              r="43"
              fill="none"
              strokeWidth="13"
            />
            {group.items.map((item, index) => {
              const prior = group.items
                .slice(0, index)
                .reduce((total, current) => total + current.value, 0);
              return (
                <circle
                  key={item.label}
                  className={`dash-donut-segment dash-stroke-${item.tone}`}
                  cx="60"
                  cy="60"
                  r="43"
                  fill="none"
                  strokeWidth="13"
                  strokeDasharray={`${(item.value / sum) * circumference} ${circumference}`}
                  strokeDashoffset={-(prior / sum) * circumference}
                />
              );
            })}
            <text
              x="60"
              y="58"
              className="dash-donut-number"
              textAnchor="middle"
            >
              {sum.toLocaleString("pt-BR")}
            </text>
            <text
              x="60"
              y="72"
              className="dash-donut-caption"
              textAnchor="middle"
            >
              registros
            </text>
          </svg>
          <div
            className="dash-bar-chart"
            role="img"
            aria-label={`Barras da distribuição atual de ${group.title.toLowerCase()}`}
          >
            {group.items.map((item) => (
              <div className="dash-bar-row" key={item.label}>
                <div className="dash-bar-label">
                  <span>{item.label}</span>
                  <strong>{item.value.toLocaleString("pt-BR")}</strong>
                </div>
                <div className="dash-bar-track">
                  <span
                    className={`dash-bar-fill dash-tone-${item.tone}`}
                    style={{ width: `${(item.value / sum) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <details className="dash-definition">
        <summary>
          <Icon name="info" />
          Como ler esta métrica
        </summary>
        <p>{group.definition}</p>
      </details>
      <details className="dash-data-details">
        <summary>Ver dados em tabela</summary>
        <div className="dash-table-wrap">
          <table>
            <caption>{group.title}: contagens atuais por estado</caption>
            <thead>
              <tr>
                <th scope="col">Estado</th>
                <th scope="col">Registros</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.label}>
                  <th scope="row">{item.label}</th>
                  <td>{item.value.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}
