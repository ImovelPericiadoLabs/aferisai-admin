import type { ExecutiveReports } from "./executive-contract";
import { rateBps } from "./executive-model";
import { NUM, bps, count, money, text, type Table } from "./report-cells";

export function parceiros(data: ExecutiveReports): Table[] {
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
