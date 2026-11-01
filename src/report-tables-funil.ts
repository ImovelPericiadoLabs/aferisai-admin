import type { ExecutiveReports } from "./executive-contract";
import { conversionSteps, deltaBps } from "./executive-model";
import {
  NUM,
  bps,
  count,
  delta,
  duration,
  money,
  text,
  type Table,
} from "./report-cells";

export function funil(data: ExecutiveReports): Table[] {
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
