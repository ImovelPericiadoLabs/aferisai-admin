import type { ExecutiveReports } from "./executive-contract";
import {
  conversionSteps,
  keyLabel,
  successBps,
  type Period,
} from "./executive-model";

const SEP = ";";

export function csvEscape(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const br = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function exportFilename(period: Period, sample: boolean): string {
  return `painel-executivo_${period.from}_${period.to}${sample ? "_exemplo" : ""}.csv`;
}

const row = (...cells: (string | number)[]) =>
  cells.map((c) => csvEscape(String(c))).join(SEP);

/** Semicolon CSV with decimal commas and a BOM, which is what Brazilian Excel expects. */
export function toCsv(
  data: ExecutiveReports,
  period: Period,
  sample: boolean,
): string {
  const { revenue } = data;
  const t = revenue.totals;
  const lines: string[] = [
    row("Painel executivo Aferis AI"),
    row("Período", `${br(period.from)} a ${br(period.to)}`),
    row("Fuso", revenue.timezone),
    row("Origem dos números", sample ? "Dados de exemplo" : "Dados do backend"),
    "",
    row("Resumo"),
    row("Receita bruta", reais(t.gross_cents)),
    row("Taxas de pagamento", reais(t.fees_cents)),
    row("Impostos", reais(t.tax_cents)),
    row("Comissões", reais(t.commission_cents)),
    row("Estornos", reais(t.refund_cents)),
    row("Receita líquida", reais(t.net_cents)),
    row("Margem de contribuição", reais(t.contribution_cents)),
    row("Pagamentos recebidos", t.intents_received),
    row("Ticket médio", reais(t.avg_ticket_cents)),
    "",
    row("Data", "Receita bruta", "Margem de contribuição", "Pagamentos"),
    ...revenue.series.map((d) =>
      row(d.date, reais(d.gross_cents), reais(d.contribution_cents), d.intents),
    ),
    "",
    row("Funil", "Quantidade", "% do total"),
    ...conversionSteps(data.funnel).map((s) =>
      row(
        s.label,
        s.count,
        s.ofTopBps === null
          ? ""
          : (s.ofTopBps / 100).toFixed(1).replace(".", ","),
      ),
    ),
    "",
  ];
  for (const [title, slices] of [
    ["Receita por canal", revenue.by_channel],
    ["Receita por origem", revenue.by_source],
    ["Receita por produto", revenue.by_product],
  ] as const) {
    lines.push(
      row(title, "Receita bruta", "Margem de contribuição", "Pagamentos"),
    );
    for (const s of slices)
      lines.push(
        row(
          keyLabel(s.key),
          reais(s.gross_cents),
          reais(s.contribution_cents),
          s.intents,
        ),
      );
    lines.push("");
  }
  lines.push(row("Parceiro", "Receita bruta", "Comissão", "Pagamentos"));
  for (const o of revenue.top_organizations)
    lines.push(
      row(o.name, reais(o.gross_cents), reais(o.commission_cents), o.intents),
    );
  lines.push("");
  lines.push(
    row(
      "Cumprimento",
      "Concluídos",
      "Falhas",
      "Incertos",
      "Taxa de sucesso (%)",
      "Mediana (s)",
      "P95 (s)",
    ),
  );
  for (const g of data.fulfillment.groups) {
    const rate = successBps(g);
    lines.push(
      row(
        keyLabel(g.key),
        g.completed,
        g.failed,
        g.unknown,
        rate === null ? "" : (rate / 100).toFixed(1).replace(".", ","),
        g.p50_seconds ?? "",
        g.p95_seconds ?? "",
      ),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
