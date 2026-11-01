import type { ExecutiveReports } from "./executive-contract";
import {
  deltaBps,
  keyLabel,
  marginBps,
  rateBps,
  type Period,
} from "./executive-model";
import {
  NUM,
  bps,
  br,
  count,
  delta,
  money,
  text,
  type Cell,
  type Table,
} from "./report-cells";

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

export function financeiro(data: ExecutiveReports, period: Period): Table[] {
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
