import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getDashboardMetrics, type DashboardMetrics } from "./api";
import { CombinedSeriesChart, SeriesChart } from "./dashboard-series";
import {
  useDashboardSeries,
  utcPreset,
  type DashboardRange,
} from "./dashboard-series-data";
import { DashboardVolumeChart } from "./dashboard-volume";
import {
  groupSum,
  groupsForRole,
  type DashboardDestination,
  type DashboardGroup,
  type DashboardRole,
} from "./dashboard-model";
import "./dashboard.css";

const DashboardMapPreview = lazy(() =>
  import("./DashboardMapPreview").then((module) => ({
    default: module.DashboardMapPreview,
  })),
);

export type DashboardPageProps = {
  role: DashboardRole;
  navigate: (page: DashboardDestination) => void;
};

type DashboardState = {
  data: DashboardMetrics | null;
  fetchedAt: Date | null;
  loading: boolean;
  error: boolean;
};

function useDashboardData() {
  const requestNumber = useRef(0);
  const [state, setState] = useState<DashboardState>({
    data: null,
    fetchedAt: null,
    loading: true,
    error: false,
  });

  const refresh = useCallback(() => {
    const currentRequest = ++requestNumber.current;
    setState((previous) => ({ ...previous, loading: true, error: false }));
    void getDashboardMetrics()
      .then((data) => {
        if (currentRequest === requestNumber.current)
          setState({
            data,
            fetchedAt: new Date(),
            loading: false,
            error: false,
          });
      })
      .catch(() => {
        if (currentRequest === requestNumber.current)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: true,
          }));
      });
  }, []);

  useEffect(() => {
    const currentRequest = ++requestNumber.current;
    void getDashboardMetrics()
      .then((data) => {
        if (currentRequest === requestNumber.current)
          setState({
            data,
            fetchedAt: new Date(),
            loading: false,
            error: false,
          });
      })
      .catch(() => {
        if (currentRequest === requestNumber.current)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: true,
          }));
      });
    return () => {
      requestNumber.current += 1;
    };
  }, []);
  return { ...state, refresh };
}

function Icon({
  name,
}: {
  name:
    DashboardGroup["icon"] | "arrow" | "refresh" | "chart" | "empty" | "info";
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    analysis: (
      <>
        <path d="M6 3.5h9l3 3V20H6z" />
        <path d="M15 3.5V7h3M9 11h6M9 14h6M9 17h4" />
      </>
    ),
    registry: (
      <>
        <path d="M4 8 12 4l8 4M6 9v9m4-9v9m4-9v9m4-9v9M4 20h16M3 8h18" />
      </>
    ),
    payment: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    commission: (
      <>
        <path d="M4 18V9m5 9V5m5 13v-7m5 7V8M3 20h18" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14-5L4 8m0-4v4h4M4 13a8 8 0 0 0 14 5l2-2m0 4v-4h-4" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5m0 14h16M8 16v-5m4 5V8m4 8V6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
    empty: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 10h8m-8 4h5" />
      </>
    ),
  };
  return (
    <svg
      className="dash-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function PageIntro({
  title,
  description,
  fetchedAt,
  onRefresh,
  loading,
}: {
  title: string;
  description: string;
  fetchedAt: Date | null;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <header className="dash-page-intro">
      <div>
        <p className="dash-eyebrow">PAINEL AFERISAI</p>
        <h1>{title}</h1>
        <p className="dash-intro-copy">{description}</p>
      </div>
      <div className="dash-intro-actions">
        {fetchedAt && (
          <span className="dash-updated">
            Consultado nesta tela às{" "}
            {fetchedAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        <button
          className="dash-icon-button"
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Atualizar métricas"
          title="Atualizar métricas"
        >
          <Icon name="refresh" />
        </button>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div
      className="dash-loading"
      role="status"
      aria-label="Carregando métricas"
      aria-busy="true"
    >
      <div className="dash-skeleton dash-skeleton-lead" />
      <div className="dash-skeleton-grid">
        {[0, 1, 2, 3].map((index) => (
          <div className="dash-skeleton-card" key={index}>
            <div className="dash-skeleton dash-skeleton-icon" />
            <div className="dash-skeleton dash-skeleton-title" />
            <div className="dash-skeleton dash-skeleton-value" />
            <div className="dash-skeleton dash-skeleton-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageState({
  kind,
  retry,
}: {
  kind: "error" | "empty";
  retry?: () => void;
}) {
  return (
    <div className="dash-message" role={kind === "error" ? "alert" : "status"}>
      <span className="dash-message-icon">
        <Icon name={kind === "error" ? "refresh" : "empty"} />
      </span>
      <h2>
        {kind === "error"
          ? "Não foi possível carregar as métricas"
          : "Ainda não há contagens disponíveis"}
      </h2>
      <p>
        {kind === "error"
          ? "Confira a conexão e tente consultar novamente."
          : "Os dados autorizados para seu perfil aparecerão aqui quando estiverem disponíveis."}
      </p>
      {retry && (
        <button type="button" className="dash-button" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

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

function GroupCard({
  group,
  navigate,
}: {
  group: DashboardGroup;
  navigate: DashboardPageProps["navigate"];
}) {
  const sum = groupSum(group);
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
      </div>
      <div className="dash-card-total">
        <strong>{sum.toLocaleString("pt-BR")}</strong>
        <span>registros</span>
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

function Attention({
  data,
  role,
  navigate,
}: {
  data: DashboardMetrics;
  role: DashboardRole;
  navigate: DashboardPageProps["navigate"];
}) {
  const items: {
    label: string;
    value: number;
    destination?: DashboardDestination;
  }[] = [];
  if (
    (role === "manager" || role === "administrator") &&
    data.registry_requests
  ) {
    items.push({
      label: "Pedidos registrais pendentes",
      value: data.registry_requests.pending,
      destination: "registry-requests",
    });
    items.push({
      label: "Pedidos registrais com erro ou incertos",
      value: data.registry_requests.error,
      destination: "registry-requests",
    });
  }
  if ((role === "manager" || role === "administrator") && data.analyses)
    items.push({
      label: "Análises com erro",
      value: data.analyses.error,
      destination: "analyses",
    });
  if (role === "financial" && data.payments)
    items.push({
      label: "Pagamentos em revisão",
      value: data.payments.review,
      destination: "financial",
    });
  if (role === "financial" && data.commissions)
    items.push({
      label: "Comissões a repassar",
      value: data.commissions.owed,
      destination: "commissions",
    });
  if (!items.length) return null;
  const active = items.filter((item) => item.value > 0);
  return (
    <section className="dash-attention" aria-labelledby="dash-attention-title">
      <div className="dash-attention-heading">
        <div>
          <p className="dash-eyebrow">PARA ACOMPANHAR</p>
          <h2 id="dash-attention-title">Pendências da equipe</h2>
        </div>
        <span className="dash-attention-count">
          {active.length}{" "}
          {active.length === 1
            ? "estado com registros"
            : "estados com registros"}
        </span>
      </div>
      {active.length ? (
        <div className="dash-attention-list">
          {active.map((item) =>
            item.destination ? (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.destination!)}
                className="dash-attention-item"
              >
                <span className="dash-attention-dot" aria-hidden="true" />
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString("pt-BR")}</strong>
                <Icon name="arrow" />
              </button>
            ) : (
              <div key={item.label} className="dash-attention-item">
                <span className="dash-attention-dot" aria-hidden="true" />
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString("pt-BR")}</strong>
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="dash-attention-clear">
          Nenhum registro nos estados de pendência disponíveis para seu perfil.
        </p>
      )}
    </section>
  );
}

function ReportChart({
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
          <Attention data={data!} role={role} navigate={navigate} />
          <section
            className="dash-overview-trend"
            aria-labelledby="dash-overview-trend-title"
          >
            <div className="dash-overview-trend-head">
              <div>
                <p className="dash-eyebrow">ÚLTIMOS 30 DIAS · UTC</p>
                <h2 id="dash-overview-trend-title">Evolução dos registros</h2>
                <p>
                  Criações diárias, comparadas ao período anterior de mesma
                  duração.
                </p>
              </div>
            </div>
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
            <div>
              <p className="dash-eyebrow">ESTADO ATUAL</p>
              <h2>Resumo por módulo</h2>
            </div>
            <span>Contagens por estado, sem filtro de período</span>
          </div>
          <div className="dash-groups">
            {groups.map((group) => (
              <GroupCard key={group.key} group={group} navigate={navigate} />
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

export function DashboardReports({ role, navigate }: DashboardPageProps) {
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
      <PageIntro
        title="Relatórios"
        description="Explore as contagens operacionais disponíveis para seu perfil."
        fetchedAt={fetchedAt}
        onRefresh={refresh}
        loading={loading}
      />
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
            className="dash-overview-trend"
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
            <Suspense
              fallback={
                <div
                  className="dash-series-loading"
                  role="status"
                  aria-label="Carregando mapa demonstrativo"
                />
              }
            >
              <DashboardMapPreview />
            </Suspense>
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
          <button
            className="dash-text-action"
            type="button"
            onClick={() => navigate("overview")}
          >
            <Icon name="arrow" /> Voltar à visão geral
          </button>
        </>
      )}
    </div>
  );
}
