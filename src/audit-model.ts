import type { ApplicationAuditItem } from "./api";

export type AuditSource = ApplicationAuditItem["source"];
export type AuditFilter = "all" | AuditSource;

const WEBHOOK_TITLES: Record<string, string> = {
  create: "Webhook cadastrado",
  activate: "Webhook ativado",
  suspend: "Webhook suspenso",
  delete: "Webhook removido",
};

const SOURCE_NAMES: Record<AuditSource, string> = {
  permission: "permissão",
  credential: "credencial",
  webhook: "webhook",
};

export const auditSourceLabel: Record<AuditSource, string> = {
  permission: "Permissões",
  credential: "Credenciais",
  webhook: "Webhook",
};

export function auditTitle(
  item: ApplicationAuditItem,
  permissionLabel: (code: string) => string,
): string {
  if (item.source === "permission" && item.action === "grant")
    return `Permissão concedida: ${permissionLabel(item.subject_code ?? "")}`;
  if (item.source === "permission" && item.action === "revoke")
    return `Permissão revogada: ${permissionLabel(item.subject_code ?? "")}`;
  if (item.source === "credential" && item.action === "issue")
    return "Credencial emitida";
  if (item.source === "credential" && item.action === "revoke")
    return "Credencial revogada";
  if (item.source === "webhook" && WEBHOOK_TITLES[item.action])
    return WEBHOOK_TITLES[item.action];
  return `Alteração registrada em ${SOURCE_NAMES[item.source]}`;
}

export function auditTone(item: ApplicationAuditItem): "success" | "warning" {
  return ["revoke", "suspend", "delete"].includes(item.action)
    ? "warning"
    : "success";
}

export function actorLabel(item: ApplicationAuditItem): string {
  if (item.actor_team_member_id) return "Equipe Aferis";
  if (item.actor_partner_member_id) return "Pessoa do parceiro";
  return "Sistema";
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  draft: "Em configuração",
};

export function statusChange(item: ApplicationAuditItem): string | null {
  if (item.source !== "webhook") return null;
  if (item.previous_status === null && item.new_status === null) return null;
  const name = (value: string | null) =>
    value === null ? "—" : (STATUS_LABELS[value] ?? value);
  return `${name(item.previous_status)} → ${name(item.new_status)}`;
}

export function filterAudit(
  items: ApplicationAuditItem[],
  filter: AuditFilter,
): ApplicationAuditItem[] {
  return filter === "all"
    ? items
    : items.filter((item) => item.source === filter);
}

export function countAudit(
  items: ApplicationAuditItem[],
): Record<AuditFilter, number> {
  return {
    all: items.length,
    permission: filterAudit(items, "permission").length,
    credential: filterAudit(items, "credential").length,
    webhook: filterAudit(items, "webhook").length,
  };
}
