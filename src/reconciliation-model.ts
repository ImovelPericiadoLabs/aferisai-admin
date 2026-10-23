import type { UncertainSubmissionItem } from "./api";
import { ageLabel } from "./ops-model";
import type { Kpi } from "./OpsParts";
import type { RowTone } from "./OpsTable";

export type UncertainRow = UncertainSubmissionItem;
export type Decision = "no_purchase" | "protocol_confirmed";

export const DECISIONS: { value: Decision; label: string; summary: string }[] =
  [
    {
      value: "no_purchase",
      label: "Sem compra",
      summary: "Conferi no portal e nenhuma compra foi feita nesta tentativa.",
    },
    {
      value: "protocol_confirmed",
      label: "Protocolo confirmado",
      summary: "Há uma compra e eu tenho o protocolo do portal.",
    },
  ];

const HOUR = 3_600_000;

/** Money may be at stake, so the clock is shorter than for ordinary work. */
export function reconciliationTone(
  item: UncertainRow,
  now: number,
): RowTone | undefined {
  const hours = (now - Date.parse(item.attempted_at)) / HOUR;
  if (hours >= 24) return "danger";
  if (hours >= 6) return "warn";
  return undefined;
}

export function reconciliationKpis(rows: UncertainRow[], now: number): Kpi[] {
  const late = rows.filter((row) => reconciliationTone(row, now) === "danger");
  const oldest = rows.reduce<string | null>(
    (best, row) =>
      best === null || row.attempted_at < best ? row.attempted_at : best,
    null,
  );
  return [
    { id: "all", label: "Pendentes", value: rows.length, hint: "carregados" },
    {
      id: "oldest",
      label: "Mais antiga",
      value: oldest ? ageLabel(oldest, now) : "—",
      hint: "desde a tentativa",
    },
    {
      id: "late",
      label: "Há mais de 24 h",
      value: late.length,
      hint: "decidir primeiro",
      tone: late.length > 0 ? "danger" : undefined,
    },
  ];
}

export function decisionError(
  decision: Decision,
  protocol: string,
): string | null {
  if (decision === "no_purchase") return null;
  const text = protocol.trim();
  if (!text) return "Informe o protocolo confirmado no portal.";
  if (text.length > 160) return "O protocolo tem no máximo 160 caracteres.";
  return null;
}
