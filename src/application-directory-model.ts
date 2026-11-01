import type {
  ApplicationBulkChanges,
  ApplicationBulkPreview,
  ApplicationBulkResult,
} from "./api";
import { applicationPermissionLabel } from "./display-labels";

export type Application = {
  id: string;
  name: string;
  status: string;
  permissions: string[];
};
export type Permission = { code: string; description: string };
export type Decision = "none" | "grant" | "revoke";

export function statusLabel(status: string): string {
  if (status === "active") return "Ativa";
  if (status === "suspended") return "Suspensa";
  return "Estado não informado";
}

export function outcomeLabel(
  outcome: ApplicationBulkResult["items"][number]["outcome"],
): string {
  if (outcome === "applied") return "Alterada";
  if (outcome === "no_change") return "Sem alteração";
  if (outcome === "conflict") return "Conflito de versão";
  if (outcome === "blocked") return "Bloqueada";
  return "Não encontrada";
}

export function reasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const known: Record<string, string> = {
    inactive_application: "A aplicação já está suspensa.",
    application_unavailable: "A aplicação não está disponível.",
    organization_inactive: "A parceria está suspensa.",
    state_changed: "A aplicação mudou após a prévia. Revise novamente.",
    permission_unavailable:
      "Uma permissão deixou de estar disponível. Gere nova prévia.",
  };
  return (
    known[reason] ??
    "Não foi possível aplicar esta alteração. Atualize a lista e tente novamente."
  );
}

export function permissionTransition(
  current: string[],
  next: string[],
): string {
  const granted = next.filter((code) => !current.includes(code));
  const revoked = current.filter((code) => !next.includes(code));
  const parts = [];
  if (granted.length)
    parts.push(
      `Conceder: ${granted.map(applicationPermissionLabel).join(", ")}`,
    );
  if (revoked.length)
    parts.push(
      `Revogar: ${revoked.map(applicationPermissionLabel).join(", ")}`,
    );
  return parts.join(" · ") || "Permissões mantidas";
}

export function previewHasChange(
  item: ApplicationBulkPreview["items"][number],
): boolean {
  return (
    item.current_status !== item.next_status ||
    item.current_permissions.length !== item.next_permissions.length ||
    item.current_permissions.some(
      (code) => !item.next_permissions.includes(code),
    )
  );
}

export function buildBulkChanges(
  permissions: Permission[],
  decisions: Record<string, Decision>,
  statusEnabled: boolean,
  nextStatus: "active" | "suspended",
): ApplicationBulkChanges {
  const changes: ApplicationBulkChanges = {};
  if (statusEnabled) changes.status = nextStatus;
  const grants = permissions
    .filter((item) => decisions[item.code] === "grant")
    .map((item) => item.code);
  const revokes = permissions
    .filter((item) => decisions[item.code] === "revoke")
    .map((item) => item.code);
  if (grants.length) changes.grant_permissions = grants;
  if (revokes.length) changes.revoke_permissions = revokes;
  return changes;
}
