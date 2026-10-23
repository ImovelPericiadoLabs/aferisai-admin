import type { RoleAccess } from "./partner-roles";

export type PortalSection = "integrations" | "metrics" | "statement" | "people";

const SECTIONS: { id: PortalSection; label: string; key: keyof RoleAccess }[] =
  [
    { id: "integrations", label: "Integrações", key: "integrations" },
    { id: "metrics", label: "Métricas", key: "metrics" },
    { id: "statement", label: "Extrato", key: "statement" },
    { id: "people", label: "Pessoas", key: "people" },
  ];

export const portalSections = (access: RoleAccess) =>
  SECTIONS.filter((section) => access[section.key]).map(({ id, label }) => ({
    id,
    label,
  }));

export const deliveryRate = (delivered: number, attempts: number) =>
  attempts === 0 ? null : Math.round((delivered / attempts) * 100);

export function latencyLabel(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(ms / 1000)} s`;
}

const STATUS: Record<string, { label: string; tone: string }> = {
  provisional: { label: "Provisória", tone: "info" },
  owed: { label: "A repassar", tone: "warning" },
  settled: { label: "Repassada", tone: "success" },
  reversed: { label: "Estornada", tone: "neutral" },
};

export const commissionStatusView = (status: string) =>
  STATUS[status] ?? { label: status, tone: "neutral" };

const KINDS: Record<string, string> = {
  analysis_completed: "Análise de arquivo",
  registry_completed: "Pedido registral",
};

export const commissionKindLabel = (kind: string) => KINDS[kind] ?? kind;
