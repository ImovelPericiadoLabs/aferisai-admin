import { useEffect, useState } from "react";
import { ApiError, getDashboardMetrics, type DashboardMetrics } from "./api";
import {
  FunnelChart,
  RankedBars,
  SegmentedBar,
  Sparkline,
  TrendChart,
} from "./ExecutiveCharts";
import { exportFilename, toCsv } from "./executive-export";
import {
  PRESETS,
  conversionSteps,
  formatBRL,
  formatDuration,
  formatCompactBRL,
  formatPercentBps,
  keyLabel,
  kpiCards,
  marginBps,
  rateBps,
  successBps,
} from "./executive-model";
import { SECTION_LABELS } from "./executive-api";
import { useExecutiveReports } from "./useExecutiveReports";
import { Attention, type DashboardPageProps } from "./DashboardOverview";
import { OrganizationAvatar } from "./OrganizationAvatar";
import "./executive.css";

type Breakdown = "by_channel" | "by_source" | "by_product";
type TrendMetric = "gross" | "contribution";

const BREAKDOWNS: { id: Breakdown; label: string }[] = [
  { id: "by_channel", label: "Canal" },
  { id: "by_source", label: "Origem" },
  { id: "by_product", label: "Produto" },
];

const number = new Intl.NumberFormat("pt-BR");

function Delta({ bps }: { bps: number | null }) {
  if (bps === null)
    return <span className="xe-delta xe-delta-none">sem comparação</span>;
  const up = bps >= 0;
  return (
    <span className={`xe-delta ${up ? "xe-delta-up" : "xe-delta-down"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Alta de" : "Queda de"}</span>
      {formatPercentBps(Math.abs(bps))}
      <small> vs. período anterior</small>
    </span>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card xe-section" aria-labelledby={id}>
      <div className="xe-section-head">
        <div>
          <h2 className="card-title" id={id}>
            {title}
          </h2>
          {description && <p className="xe-sub">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

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

      <section className="xe-live card" aria-labelledby="xe-live-title">
        <div className="xe-section-head">
          <div>
            <h2 className="card-title" id="xe-live-title">
              Situação agora
            </h2>
            <p className="xe-sub">
              Contagens atuais por estado, sem filtro de período.
            </p>
          </div>
          <span className="badge badge-success">Dados reais</span>
        </div>
        {liveFailed ? (
          <p className="xe-sub" role="status">
            Não foi possível carregar as contagens agora.
          </p>
        ) : !live ? (
          <div className="rules-skeleton" role="status" aria-label="Carregando">
            <span className="skeleton" />
          </div>
        ) : (
          <dl className="xe-live-grid">
            {live.analyses && (
              <>
                <div>
                  <dt>Análises concluídas</dt>
                  <dd>{number.format(live.analyses.completed)}</dd>
                </div>
                <div data-tone={live.analyses.error ? "danger" : undefined}>
                  <dt>Análises com erro</dt>
                  <dd>{number.format(live.analyses.error)}</dd>
                </div>
                <div>
                  <dt>Na fila ou em execução</dt>
                  <dd>
                    {number.format(
                      live.analyses.queued + live.analyses.running,
                    )}
                  </dd>
                </div>
              </>
            )}
            {live.payments && (
              <>
                <div>
                  <dt>Pagamentos recebidos</dt>
                  <dd>{number.format(live.payments.received)}</dd>
                </div>
                <div data-tone={live.payments.review ? "warning" : undefined}>
                  <dt>Pagamentos em revisão</dt>
                  <dd>{number.format(live.payments.review)}</dd>
                </div>
              </>
            )}
            {live.registry_requests && (
              <div>
                <dt>Pedidos registrais confirmados</dt>
                <dd>{number.format(live.registry_requests.confirmed)}</dd>
              </div>
            )}
            {live.commissions && (
              <div>
                <dt>Comissões a repassar</dt>
                <dd>{number.format(live.commissions.owed)}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

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
              onClick={() => setMetric("gross")}
            >
              Receita bruta
            </button>
            <button
              type="button"
              className="seg-item"
              aria-pressed={metric === "contribution"}
              onClick={() => setMetric("contribution")}
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

      <div className="xe-grid-2">
        <Section
          id="xe-funnel"
          title="Funil de conversão"
          description="Do pedido à entrega, no período."
        >
          <FunnelChart rows={steps} />
        </Section>
        <Section
          id="xe-breakdown"
          title="De onde vem a receita"
          description="Receita bruta no período."
        >
          <div className="seg" role="group" aria-label="Agrupar por">
            {BREAKDOWNS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="seg-item"
                aria-pressed={breakdown === item.id}
                onClick={() => setBreakdown(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <RankedBars
            label={`Receita por ${BREAKDOWNS.find((b) => b.id === breakdown)?.label.toLowerCase()}`}
            rows={revenue[breakdown].map((slice) => ({
              key: slice.key,
              label: keyLabel(slice.key),
              value: slice.gross_cents,
              display: formatBRL(slice.gross_cents),
              hint: `${number.format(slice.intents)} pagamentos · margem ${formatPercentBps(rateBps(slice.contribution_cents, slice.gross_cents) ?? 0)}`,
            }))}
          />
        </Section>
      </div>

      <div className="xe-grid-2">
        <Section
          id="xe-partners"
          title="Parceiros"
          description="Maiores receitas vindas de integrações, cupons e links."
        >
          <div className="data-table-wrap">
            <table
              className="data-table xe-table"
              aria-label="Receita por parceiro"
            >
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Parceiro</th>
                  <th scope="col">Receita</th>
                  <th scope="col">Comissão</th>
                  <th scope="col">Pagamentos</th>
                </tr>
              </thead>
              <tbody>
                {revenue.top_organizations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="xc-empty">
                      Sem vendas por parceiros no período.
                    </td>
                  </tr>
                )}
                {revenue.top_organizations.map((org, index) => (
                  <tr key={org.organization_id}>
                    <td data-label="#" className="xe-rank-cell">
                      {index + 1}
                    </td>
                    <td data-label="Parceiro" className="xe-title-cell">
                      <span className="xe-partner">
                        <OrganizationAvatar
                          id={org.organization_id}
                          name={org.name}
                          logoUrl={org.logo_url}
                        />
                        {org.name}
                      </span>
                    </td>
                    <td data-label="Receita">{formatBRL(org.gross_cents)}</td>
                    <td data-label="Comissão">
                      {formatBRL(org.commission_cents)}
                    </td>
                    <td data-label="Pagamentos">
                      {number.format(org.intents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
        <Section
          id="xe-commissions"
          title="Comissões"
          description="Situação do que foi gerado para parceiros."
        >
          <SegmentedBar
            label="Comissões por situação"
            segments={[
              {
                key: "provisional",
                label: "Provisória",
                value: data.commissions.totals.provisional_cents,
                display: formatBRL(data.commissions.totals.provisional_cents),
                tone: "info",
              },
              {
                key: "owed",
                label: "A repassar",
                value: data.commissions.totals.owed_cents,
                display: formatBRL(data.commissions.totals.owed_cents),
                tone: "warning",
              },
              {
                key: "settled",
                label: "Repassada",
                value: data.commissions.totals.settled_cents,
                display: formatBRL(data.commissions.totals.settled_cents),
                tone: "success",
              },
              {
                key: "reversed",
                label: "Estornada",
                value: data.commissions.totals.reversed_cents,
                display: formatBRL(data.commissions.totals.reversed_cents),
                tone: "neutral",
              },
            ]}
          />
          <h3 className="xe-h3">Maiores saldos a repassar</h3>
          <RankedBars
            label="Saldo a repassar por parceiro"
            tone="warning"
            rows={[...data.commissions.by_organization]
              .sort((a, b) => b.owed_cents - a.owed_cents)
              .slice(0, 5)
              .map((org) => ({
                key: org.organization_id,
                label: org.name,
                value: org.owed_cents,
                display: formatBRL(org.owed_cents),
              }))}
          />
        </Section>
      </div>

      <Section
        id="xe-fulfillment"
        title="Entrega por fornecedor"
        description="Taxa de sucesso e tempo até concluir. Resultado incerto conta como não concluído."
      >
        <div className="data-table-wrap">
          <table
            className="data-table xe-table"
            aria-label="Entrega por fornecedor"
          >
            <thead>
              <tr>
                <th scope="col">Fornecedor</th>
                <th scope="col">Concluídos</th>
                <th scope="col">Falhas</th>
                <th scope="col">Incertos</th>
                <th scope="col">Sucesso</th>
                <th scope="col">Mediana</th>
                <th scope="col">P95</th>
              </tr>
            </thead>
            <tbody>
              {data.fulfillment.groups.length === 0 && (
                <tr>
                  <td colSpan={7} className="xc-empty">
                    Nenhuma entrega concluída no período.
                  </td>
                </tr>
              )}
              {data.fulfillment.groups.map((g) => {
                const rate = successBps(g);
                return (
                  <tr key={g.key}>
                    <td data-label="Fornecedor" className="xe-title-cell">
                      {keyLabel(g.key)}
                    </td>
                    <td data-label="Concluídos">
                      {number.format(g.completed)}
                    </td>
                    <td data-label="Falhas">{number.format(g.failed)}</td>
                    <td data-label="Incertos">{number.format(g.unknown)}</td>
                    <td data-label="Sucesso">
                      <span
                        className={`badge ${rate !== null && rate >= 9500 ? "badge-success" : rate !== null && rate >= 9000 ? "badge-warning" : "badge-danger"}`}
                      >
                        {rate === null ? "—" : formatPercentBps(rate)}
                      </span>
                    </td>
                    <td data-label="Mediana">
                      {formatDuration(g.p50_seconds)}
                    </td>
                    <td data-label="P95">{formatDuration(g.p95_seconds)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="xe-grid-3">
        <Section
          id="xe-exceptions"
          title="Exceções financeiras"
          description="Casos pagos sem entrega."
        >
          <dl className="xe-stats">
            <div data-tone={data.exceptions.overdue ? "danger" : undefined}>
              <dt>Vencidas</dt>
              <dd>{data.exceptions.overdue}</dd>
            </div>
            <div>
              <dt>Abertas</dt>
              <dd>{data.exceptions.open}</dd>
            </div>
            <div>
              <dt>Vencem em 24 h</dt>
              <dd>{data.exceptions.due_in_24h}</dd>
            </div>
            <div>
              <dt>Valor em aberto</dt>
              <dd>{formatBRL(data.exceptions.amount_open_cents)}</dd>
            </div>
            <div>
              <dt>Estornado no período</dt>
              <dd>{formatBRL(data.exceptions.refunded_cents)}</dd>
            </div>
            <div>
              <dt>Tempo médio para resolver</dt>
              <dd>
                {data.exceptions.avg_resolution_hours === null
                  ? "—"
                  : formatDuration(data.exceptions.avg_resolution_hours * 3600)}
              </dd>
            </div>
          </dl>
        </Section>
        <Section
          id="xe-ai"
          title="Uso de IA"
          description="Chamadas por modelo."
        >
          <div className="data-table-wrap">
            <table
              className="data-table xe-table"
              aria-label="Uso de IA por modelo"
            >
              <thead>
                <tr>
                  <th scope="col">Modelo</th>
                  <th scope="col">Chamadas</th>
                  <th scope="col">Falhas</th>
                  <th scope="col">Latência</th>
                </tr>
              </thead>
              <tbody>
                {data.ai.groups.length === 0 && (
                  <tr>
                    <td colSpan={4} className="xc-empty">
                      Nenhuma chamada de IA no período.
                    </td>
                  </tr>
                )}
                {data.ai.groups.map((g) => (
                  <tr key={g.key}>
                    <td data-label="Modelo" className="xe-title-cell">
                      {g.key}
                    </td>
                    <td data-label="Chamadas">{number.format(g.calls)}</td>
                    <td data-label="Falhas">
                      {formatPercentBps(rateBps(g.failed, g.calls) ?? 0)}
                    </td>
                    <td data-label="Latência">
                      {g.avg_latency_ms === null
                        ? "—"
                        : formatDuration(g.avg_latency_ms / 1000)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="xe-note">
            O custo em reais por chamada depende de uma decisão de preço por
            modelo.
          </p>
        </Section>
        <Section
          id="xe-webhooks"
          title="Webhooks"
          description="Entregas aos parceiros."
        >
          <dl className="xe-stats">
            <div>
              <dt>Tentativas</dt>
              <dd>{number.format(data.webhooks.attempts)}</dd>
            </div>
            <div>
              <dt>Entregues</dt>
              <dd>
                {formatPercentBps(
                  rateBps(data.webhooks.delivered, data.webhooks.attempts) ?? 0,
                )}
              </dd>
            </div>
            <div>
              <dt>Latência mediana</dt>
              <dd>
                {data.webhooks.p50_ms === null
                  ? "—"
                  : `${data.webhooks.p50_ms} ms`}
              </dd>
            </div>
            <div>
              <dt>Latência p95</dt>
              <dd>
                {data.webhooks.p95_ms === null
                  ? "—"
                  : formatDuration(data.webhooks.p95_ms / 1000)}
              </dd>
            </div>
          </dl>
          <h3 className="xe-h3">Maiores taxas de falha</h3>
          {data.webhooks.worst_applications.length === 0 && (
            <p className="xc-empty" role="status">
              Nenhuma entrega com falha no período.
            </p>
          )}
          <ul className="xe-plain">
            {data.webhooks.worst_applications.map((app) => (
              <li key={app.application_id}>
                <span>{app.name}</span>
                <strong>{formatPercentBps(app.failure_rate_bps)}</strong>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
