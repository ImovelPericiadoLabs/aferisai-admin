import type { ExecutiveReports } from "./executive-contract";
import {
  conversionSteps,
  deltaBps,
  formatBRL,
  formatDuration,
  formatPercentBps,
  keyLabel,
  marginBps,
  rateBps,
  successBps,
  type Period,
} from "./executive-model";
import { SAMPLE_LABEL } from "./executive-export";
import { csvEscape } from "./executive-export";

export type Cell =
  | { t: "text"; v: string }
  | { t: "money"; v: number }
  | { t: "count"; v: number }
  | { t: "bps"; v: number | null }
  | { t: "duration"; v: number | null }
  | { t: "delta"; v: number | null };

export type Column = { label: string; align?: "right" };
export type Table = {
  id: string;
  title: string;
  note?: string;
  columns: Column[];
  rows: Cell[][];
};

export type ReportId =
  "financeiro" | "funil" | "parceiros" | "fornecedores" | "integracoes";

export const REPORTS: {
  id: ReportId;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "financeiro",
    label: "Financeiro",
    icon: "coin",
    description:
      "Receita, deduções e margem por dia, canal, origem e produto, em horário de Brasília.",
  },
  {
    id: "funil",
    label: "Funil e exceções",
    icon: "funnel",
    description:
      "Do pedido à entrega, e os casos pagos sem entrega que aguardam decisão.",
  },
  {
    id: "parceiros",
    label: "Parceiros",
    icon: "partners",
    description:
      "Receita e comissão por parceiro e a situação do que é devido.",
  },
  {
    id: "fornecedores",
    label: "Fornecedores e IA",
    icon: "vendors",
    description: "Taxa de sucesso, tempo de entrega e uso de IA por modelo.",
  },
  {
    id: "integracoes",
    label: "Integrações",
    icon: "webhook",
    description: "Entrega de webhooks e as aplicações com mais falhas.",
  },
];

const text = (v: string): Cell => ({ t: "text", v });
const money = (v: number): Cell => ({ t: "money", v });
const count = (v: number): Cell => ({ t: "count", v });
const bps = (v: number | null): Cell => ({ t: "bps", v });
const duration = (v: number | null): Cell => ({ t: "duration", v });
const delta = (v: number | null): Cell => ({ t: "delta", v });
const br = (iso: string) => iso.split("-").reverse().join("/");

const number = new Intl.NumberFormat("pt-BR");
const decimal = (n: number) => String(n).replace(".", ",");

export function cellText(cell: Cell): string {
  switch (cell.t) {
    case "text":
      return cell.v;
    case "money":
      return formatBRL(cell.v);
    case "count":
      return number.format(cell.v);
    case "bps":
      return cell.v === null ? "—" : formatPercentBps(cell.v);
    case "duration":
      return formatDuration(cell.v);
    case "delta":
      if (cell.v === null) return "—";
      return `${cell.v >= 0 ? "+" : "−"}${formatPercentBps(Math.abs(cell.v))}`;
  }
}

/** Raw value for spreadsheets: reais and percentages with a decimal comma, seconds as numbers. */
export function cellCsv(cell: Cell): string {
  switch (cell.t) {
    case "text":
      return cell.v;
    case "money":
      return (cell.v / 100).toFixed(2).replace(".", ",");
    case "count":
      return String(cell.v);
    case "bps":
    case "delta":
      return cell.v === null ? "" : decimal(Math.round(cell.v) / 100);
    case "duration":
      return cell.v === null ? "" : String(Math.round(cell.v));
  }
}

const NUM = { align: "right" as const };

function comparing(data: ExecutiveReports): boolean {
  return data.revenue.previous !== undefined;
}

function sliceTable(
  id: string,
  title: string,
  slices: ExecutiveReports["revenue"]["by_channel"],
  total: number,
): Table {
  return {
    id,
    title,
    columns: [
      { label: "Grupo" },
      { label: "Pagamentos", ...NUM },
      { label: "Receita bruta", ...NUM },
      { label: "% da receita", ...NUM },
      { label: "Margem (R$)", ...NUM },
      { label: "Margem (%)", ...NUM },
    ],
    rows: slices.map((s) => [
      text(keyLabel(s.key)),
      count(s.intents),
      money(s.gross_cents),
      bps(rateBps(s.gross_cents, total)),
      money(s.contribution_cents),
      bps(rateBps(s.contribution_cents, s.gross_cents)),
    ]),
  };
}

function financeiro(data: ExecutiveReports, period: Period): Table[] {
  const { revenue } = data;
  const t = revenue.totals;
  const p = revenue.previous;
  const withPrev = comparing(data);
  const line = (
    label: string,
    now: number,
    before: number | undefined,
    kind: "money" | "count" = "money",
  ): Cell[] => {
    const make = kind === "money" ? money : count;
    const base = [text(label), make(now)];
    return withPrev
      ? [...base, make(before ?? 0), delta(deltaBps(now, before))]
      : base;
  };
  const marginNow = marginBps(t);
  const marginBefore = p ? marginBps(p) : null;
  const summaryRows: Cell[][] = [
    line("Receita bruta", t.gross_cents, p?.gross_cents),
    line("Taxas de pagamento", t.fees_cents, p?.fees_cents),
    line("Impostos", t.tax_cents, p?.tax_cents),
    line("Comissões de parceiros", t.commission_cents, p?.commission_cents),
    line("Estornos", t.refund_cents, p?.refund_cents),
    line("Receita líquida", t.net_cents, p?.net_cents),
    line("Margem de contribuição", t.contribution_cents, p?.contribution_cents),
    line("Pagamentos", t.intents_received, p?.intents_received, "count"),
    line("Ticket médio", t.avg_ticket_cents, p?.avg_ticket_cents),
  ];
  const marginRow: Cell[] = withPrev
    ? [
        text("Margem sobre a receita bruta"),
        bps(marginNow),
        bps(marginBefore),
        delta(
          marginNow !== null && marginBefore !== null
            ? deltaBps(marginNow, marginBefore)
            : null,
        ),
      ]
    : [text("Margem sobre a receita bruta"), bps(marginNow)];
  summaryRows.splice(7, 0, marginRow);
  return [
    {
      id: "resumo",
      title: "Resumo do período",
      note: `Pagamentos confirmados de ${br(period.from)} a ${br(period.to)}. A margem é a das cotações, não a realizada.`,
      columns: withPrev
        ? [
            { label: "Indicador" },
            { label: "Período", ...NUM },
            { label: "Anterior", ...NUM },
            { label: "Variação", ...NUM },
          ]
        : [{ label: "Indicador" }, { label: "Período", ...NUM }],
      rows: summaryRows,
    },
    {
      id: "dia",
      title: "Receita por dia",
      columns: [
        { label: "Data" },
        { label: "Pagamentos", ...NUM },
        { label: "Receita bruta", ...NUM },
        { label: "Margem de contribuição", ...NUM },
        { label: "Ticket médio", ...NUM },
      ],
      rows: revenue.series.map((d) => [
        text(br(d.date)),
        count(d.intents),
        money(d.gross_cents),
        money(d.contribution_cents),
        money(d.intents ? Math.round(d.gross_cents / d.intents) : 0),
      ]),
    },
    sliceTable("canal", "Receita por canal", revenue.by_channel, t.gross_cents),
    sliceTable(
      "origem",
      "Receita por origem",
      revenue.by_source,
      t.gross_cents,
    ),
    sliceTable(
      "produto",
      "Receita por produto",
      revenue.by_product,
      t.gross_cents,
    ),
  ];
}

function funil(data: ExecutiveReports): Table[] {
  const steps = conversionSteps(data.funnel);
  const previous = data.funnel.previous;
  const ex = data.exceptions;
  return [
    {
      id: "funil",
      title: "Funil de conversão",
      columns: [
        { label: "Etapa" },
        { label: "Quantidade", ...NUM },
        { label: "% do total", ...NUM },
        { label: "% da etapa anterior", ...NUM },
        { label: "Período anterior", ...NUM },
        { label: "Variação", ...NUM },
      ],
      rows: steps.map((s) => {
        const before = previous?.find((p) => p.key === s.key)?.count;
        return [
          text(s.label),
          count(s.count),
          bps(s.ofTopBps),
          bps(s.ofPreviousBps),
          before === undefined ? text("—") : count(before),
          delta(deltaBps(s.count, before)),
        ];
      }),
    },
    {
      id: "excecoes",
      title: "Exceções financeiras",
      note: "Casos pagos sem entrega. O prazo de decisão conta dois dias úteis.",
      columns: [{ label: "Indicador" }, { label: "Valor", ...NUM }],
      rows: [
        [text("Casos abertos"), count(ex.open)],
        [text("Casos vencidos"), count(ex.overdue)],
        [text("Vencem em 24 horas"), count(ex.due_in_24h)],
        [text("Valor em aberto"), money(ex.amount_open_cents)],
        [text("Estornado no período"), money(ex.refunded_cents)],
        [
          text("Tempo médio para resolver"),
          duration(
            ex.avg_resolution_hours === null
              ? null
              : ex.avg_resolution_hours * 3600,
          ),
        ],
      ],
    },
  ];
}

function parceiros(data: ExecutiveReports): Table[] {
  const { revenue, commissions } = data;
  const total = revenue.totals.gross_cents;
  const totals = commissions.totals;
  const sum =
    totals.provisional_cents +
    totals.owed_cents +
    totals.settled_cents +
    totals.reversed_cents;
  return [
    {
      id: "ranking",
      title: "Receita por parceiro",
      note: "Integrações, cupons e links. Receita do site não passa por parceiro.",
      columns: [
        { label: "#", ...NUM },
        { label: "Parceiro" },
        { label: "Pagamentos", ...NUM },
        { label: "Receita bruta", ...NUM },
        { label: "% da receita", ...NUM },
        { label: "Comissão", ...NUM },
        { label: "Comissão sobre a receita", ...NUM },
      ],
      rows: [...revenue.top_organizations]
        .sort((a, b) => b.gross_cents - a.gross_cents)
        .map((o, index) => [
          count(index + 1),
          text(o.name),
          count(o.intents),
          money(o.gross_cents),
          bps(rateBps(o.gross_cents, total)),
          money(o.commission_cents),
          bps(rateBps(o.commission_cents, o.gross_cents)),
        ]),
    },
    {
      id: "situacao",
      title: "Comissões por situação",
      note: "Provisória ainda depende de conclusão; só a parte a repassar é dívida.",
      columns: [
        { label: "Situação" },
        { label: "Valor", ...NUM },
        { label: "% do total", ...NUM },
      ],
      rows: [
        ["Provisória", totals.provisional_cents],
        ["A repassar", totals.owed_cents],
        ["Repassada", totals.settled_cents],
        ["Estornada", totals.reversed_cents],
      ].map(([label, value]) => [
        text(label as string),
        money(value as number),
        bps(rateBps(value as number, sum)),
      ]),
    },
    {
      id: "saldos",
      title: "Saldos por parceiro",
      columns: [
        { label: "Parceiro" },
        { label: "A repassar", ...NUM },
        { label: "Já repassado", ...NUM },
      ],
      rows: [...commissions.by_organization]
        .sort((a, b) => b.owed_cents - a.owed_cents)
        .map((o) => [
          text(o.name),
          money(o.owed_cents),
          money(o.settled_cents),
        ]),
    },
  ];
}

function fornecedores(data: ExecutiveReports): Table[] {
  return [
    {
      id: "entrega",
      title: "Entrega por fornecedor",
      note: "Resultado incerto conta como não concluído.",
      columns: [
        { label: "Fornecedor" },
        { label: "Concluídos", ...NUM },
        { label: "Falhas", ...NUM },
        { label: "Incertos", ...NUM },
        { label: "Taxa de sucesso", ...NUM },
        { label: "Mediana", ...NUM },
        { label: "P95", ...NUM },
      ],
      rows: data.fulfillment.groups.map((g) => [
        text(keyLabel(g.key)),
        count(g.completed),
        count(g.failed),
        count(g.unknown),
        bps(successBps(g)),
        duration(g.p50_seconds),
        duration(g.p95_seconds),
      ]),
    },
    {
      id: "ia",
      title: "Uso de IA por modelo",
      note: "O custo em reais por chamada depende de um preço por modelo ainda não definido.",
      columns: [
        { label: "Modelo" },
        { label: "Chamadas", ...NUM },
        { label: "Falhas", ...NUM },
        { label: "Taxa de falha", ...NUM },
        { label: "Tokens de entrada", ...NUM },
        { label: "Tokens de saída", ...NUM },
        { label: "Latência média", ...NUM },
      ],
      rows: data.ai.groups.map((g) => [
        text(g.key),
        count(g.calls),
        count(g.failed),
        bps(rateBps(g.failed, g.calls)),
        count(g.input_tokens),
        count(g.output_tokens),
        duration(g.avg_latency_ms === null ? null : g.avg_latency_ms / 1000),
      ]),
    },
  ];
}

function integracoes(data: ExecutiveReports): Table[] {
  const w = data.webhooks;
  return [
    {
      id: "webhooks",
      title: "Entrega de webhooks",
      columns: [{ label: "Indicador" }, { label: "Valor", ...NUM }],
      rows: [
        [text("Tentativas"), count(w.attempts)],
        [text("Entregues"), count(w.delivered)],
        [text("Falhas"), count(w.failed)],
        [text("Taxa de entrega"), bps(rateBps(w.delivered, w.attempts))],
        [
          text("Latência mediana"),
          duration(w.p50_ms === null ? null : w.p50_ms / 1000),
        ],
        [
          text("Latência p95"),
          duration(w.p95_ms === null ? null : w.p95_ms / 1000),
        ],
      ],
    },
    {
      id: "piores",
      title: "Aplicações com mais falhas",
      columns: [{ label: "Aplicação" }, { label: "Taxa de falha", ...NUM }],
      rows: w.worst_applications.map((a) => [
        text(a.name),
        bps(a.failure_rate_bps),
      ]),
    },
  ];
}

export function reportTables(
  id: ReportId,
  data: ExecutiveReports,
  period: Period,
): Table[] {
  switch (id) {
    case "financeiro":
      return financeiro(data, period);
    case "funil":
      return funil(data);
    case "parceiros":
      return parceiros(data);
    case "fornecedores":
      return fornecedores(data);
    case "integracoes":
      return integracoes(data);
  }
}

export const reportFilename = (id: ReportId, period: Period, sample: boolean) =>
  `relatorio-${id}_${period.from}_${period.to}${sample ? "_exemplo" : ""}.csv`;

/** One CSV with every table of a report, in the format Brazilian Excel opens directly. */
export function tablesToCsv(
  title: string,
  tables: Table[],
  period: Period,
  sample: boolean,
): string {
  const row = (cells: string[]) => cells.map(csvEscape).join(";");
  const lines = [
    row([`Relatório ${title} — Aferis AI`]),
    row(["Período", `${br(period.from)} a ${br(period.to)}`]),
    row(["Fuso", "America/Sao_Paulo"]),
    row(["Origem dos números", sample ? SAMPLE_LABEL : "Dados do backend"]),
  ];
  for (const table of tables) {
    lines.push("", row([table.title]));
    lines.push(row(table.columns.map((c) => c.label)));
    for (const r of table.rows) lines.push(row(r.map(cellCsv)));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
