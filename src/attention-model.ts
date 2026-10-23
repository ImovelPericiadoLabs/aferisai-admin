import type { AttentionPage } from "./api";
import type { Kpi } from "./OpsParts";
import type { RowTone } from "./OpsTable";

export type AttentionRow = AttentionPage["items"][number];
export type AttentionViewId =
  "all" | "failed" | "uncertain" | "suspended" | "completed";

export const ATTENTION_VIEWS: { id: AttentionViewId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "failed", label: "Falhas" },
  { id: "uncertain", label: "Resultado incerto" },
  { id: "suspended", label: "Suspensos" },
  { id: "completed", label: "Concluídos para revisão" },
];

export function attentionView(
  row: AttentionRow,
): Exclude<AttentionViewId, "all"> {
  if (row.status === "failed") return "failed";
  if (row.status === "unknown") return "uncertain";
  if (row.status === "suspended") return "suspended";
  return "completed";
}

export function attentionTone(row: AttentionRow): RowTone | undefined {
  if (row.status === "failed" || row.status === "unknown") return "danger";
  if (row.status === "suspended") return "warn";
  return undefined;
}

export function attentionViewCounts(
  rows: AttentionRow[],
): Record<AttentionViewId, number> {
  const counts: Record<AttentionViewId, number> = {
    all: rows.length,
    failed: 0,
    uncertain: 0,
    suspended: 0,
    completed: 0,
  };
  for (const row of rows) counts[attentionView(row)] += 1;
  return counts;
}

export function attentionKpis(rows: AttentionRow[]): Kpi[] {
  const counts = attentionViewCounts(rows);
  const hint = `nos ${rows.length} carregados`;
  return [
    {
      id: "all",
      label: "Pedem atenção",
      value: counts.all,
      hint: "carregados",
    },
    {
      id: "failed",
      label: "Falhas",
      value: counts.failed,
      hint,
      tone: counts.failed > 0 ? "danger" : undefined,
    },
    {
      id: "uncertain",
      label: "Resultado incerto",
      value: counts.uncertain,
      hint,
      tone: counts.uncertain > 0 ? "danger" : undefined,
    },
    {
      id: "suspended",
      label: "Suspensos",
      value: counts.suspended,
      hint,
      tone: counts.suspended > 0 ? "warning" : undefined,
    },
    { id: "completed", label: "Para revisão", value: counts.completed, hint },
  ];
}
