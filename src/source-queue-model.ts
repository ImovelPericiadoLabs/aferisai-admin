import type { PendingSourcePage, SourceKind } from "./api";
import type { Kpi } from "./OpsParts";
import type { RowTone } from "./OpsTable";

export type PendingSource = PendingSourcePage["items"][number];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const SOURCE_OPTIONS: {
  value: SourceKind;
  label: string;
  summary: string;
}[] = [
  {
    value: "unverified",
    label: "Não foi possível verificar",
    summary: "O arquivo não permite concluir a natureza. É a escolha segura.",
  },
  {
    value: "third_party_report",
    label: "Relatório derivado",
    summary: "Um relatório de terceiros, não a matrícula do registro.",
  },
  {
    value: "registry_record",
    label: "Documento registral",
    summary: "A matrícula emitida pelo cartório.",
  },
];

/** Time left before the original is purged. */
export function expiryLabel(expiresAt: string, now: number): string {
  const left = Date.parse(expiresAt) - now;
  if (Number.isNaN(left)) return "—";
  if (left <= 0) return "vencido";
  if (left < HOUR) return `${Math.max(1, Math.floor(left / MIN))} min`;
  if (left < DAY) return `${Math.floor(left / HOUR)} h`;
  return `${Math.floor(left / DAY)} d`;
}

export function expiryTone(
  item: PendingSource,
  now: number,
): RowTone | undefined {
  const left = Date.parse(item.expires_at) - now;
  if (left < 6 * HOUR) return "danger";
  if (left < DAY) return "warn";
  return undefined;
}

export function sourceKpis(rows: PendingSource[], now: number): Kpi[] {
  const soon = rows.filter((row) => Date.parse(row.expires_at) - now < DAY);
  const next = rows.reduce<string | null>(
    (best, row) =>
      best === null || row.expires_at < best ? row.expires_at : best,
    null,
  );
  return [
    { id: "all", label: "Aguardando", value: rows.length, hint: "carregados" },
    {
      id: "next",
      label: "Próximo a expirar",
      value: next ? expiryLabel(next, now) : "—",
      hint: "decidir primeiro",
    },
    {
      id: "soon",
      label: "Expiram em 24 h",
      value: soon.length,
      hint: "urgentes",
      tone: soon.length > 0 ? "warning" : undefined,
    },
  ];
}
