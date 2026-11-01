import type { ExecutiveReports } from "./executive-contract";
import type { Period } from "./executive-model";
import { SAMPLE_LABEL, csvEscape } from "./executive-export";
import { br, cellCsv, type Table } from "./report-cells";
import { financeiro } from "./report-tables-financeiro";
import { funil } from "./report-tables-funil";
import { parceiros } from "./report-tables-parceiros";
import { fornecedores, integracoes } from "./report-tables-operacao";

export {
  cellCsv,
  cellText,
  type Cell,
  type Column,
  type Table,
} from "./report-cells";

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
