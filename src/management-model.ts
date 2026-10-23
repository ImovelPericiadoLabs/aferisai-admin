import { statusLabel, teamRoleLabel } from "./display-labels";

export type TeamRoleValue =
  "administrator" | "manager" | "financial" | "viewer";
export type ManagedKind = "organization" | "user" | "team";

export const TEAM_ROLE_OPTIONS: {
  value: TeamRoleValue;
  label: string;
  summary: string;
}[] = [
  {
    value: "administrator",
    label: "Administrador",
    summary:
      "Acesso total, incluindo equipe, provedores de IA e regras comerciais.",
  },
  {
    value: "manager",
    label: "Gestor",
    summary:
      "Revisa análises e pedidos e gerencia parceiros, conexões e usuários.",
  },
  {
    value: "financial",
    label: "Financeiro",
    summary: "Vê as exceções financeiras e os repasses.",
  },
  {
    value: "viewer",
    label: "Consulta",
    summary: "Vê a visão geral e os relatórios.",
  },
];

export function validateManagementReason(reason: string): {
  ok: boolean;
  message: string;
} {
  const length = reason.trim().length;
  if (length < 5)
    return {
      ok: false,
      message: `Escreva pelo menos 5 caracteres (${length}/5).`,
    };
  if (length > 500)
    return {
      ok: false,
      message: `Use no máximo 500 caracteres (${length}/500).`,
    };
  return { ok: true, message: "" };
}

/** Mirrors normalize_cnpj (app/organizations/svc/management.py): numeric and alphanumeric CNPJ. */
export function validateCnpj(
  input: string,
): { ok: true; normalized: string } | { ok: false; message: string } {
  const normalized = input
    .trim()
    .toUpperCase()
    .replace(/[./\- ]/g, "");
  const invalid = (message: string) => ({ ok: false as const, message });
  if (normalized.length !== 14 || !/^[0-9A-Z]{12}[0-9]{2}$/.test(normalized))
    return invalid(
      "O CNPJ tem 14 caracteres: 12 letras ou números e 2 dígitos verificadores.",
    );
  if (new Set(normalized).size === 1)
    return invalid("CNPJ com todos os caracteres iguais não é válido.");
  const digit = (prefix: string) => {
    const weights =
      prefix.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const remainder =
      [...prefix].reduce(
        (sum, char, index) => sum + (char.charCodeAt(0) - 48) * weights[index],
        0,
      ) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const check = `${digit(normalized.slice(0, 12))}${digit(normalized.slice(0, 13))}`;
  if (normalized.slice(12) !== check)
    return invalid("Os dígitos verificadores do CNPJ não conferem.");
  return { ok: true, normalized };
}

/** The backend refuses these too; saying why up front saves a round trip. */
export function memberBlocks(
  member: { id: string },
  actorId: string,
): { role: string | null; status: string | null } {
  const own = member.id === actorId;
  return {
    role: own ? "Você não pode alterar o próprio papel." : null,
    status: own ? "Você não pode suspender a própria conta." : null,
  };
}

const EVENT_LABELS: Record<string, string> = {
  invited: "Convite enviado",
  activated: "Acesso ativado",
  role_changed: "Papel alterado",
  suspended: "Suspensão",
  reactivated: "Reativação",
  cnpj_changed: "CNPJ alterado",
};

export const eventLabel = (action: string) =>
  EVENT_LABELS[action] ?? "Evento registrado";

export function eventValueLabel(action: string, value: string | null): string {
  if (value === null) return "—";
  if (action === "role_changed" || action === "invited")
    return teamRoleLabel(value);
  if (action === "suspended" || action === "reactivated")
    return statusLabel(value);
  return value;
}

export const eventActorLabel = (
  actorId: string,
  names: Map<string, string> | undefined,
) => names?.get(actorId) ?? "Equipe Aferis";

export function statusCopy(
  kind: ManagedKind,
  next: "active" | "suspended",
): { title: string; description: string; confirm: string; success: string } {
  if (next === "active")
    return {
      title: "Reativar acesso?",
      description:
        kind === "organization"
          ? "A parceria volta a operar. As pessoas e aplicações dela retomam o acesso."
          : "A conta volta a poder entrar. Será preciso entrar de novo.",
      confirm: "Reativar acesso",
      success: "Acesso reativado.",
    };
  return {
    title: "Suspender acesso?",
    description:
      kind === "organization"
        ? "A suspensão bloqueia as operações parceiras que consultam esta organização. O motivo fica na trilha de auditoria."
        : "As sessões atuais são encerradas na hora e a conta não consegue entrar de novo até ser reativada.",
    confirm: "Suspender acesso",
    success: "Acesso suspenso.",
  };
}
