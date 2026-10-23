import type { PartnerRole } from "./api";

export const ROLE_OPTIONS: {
  value: PartnerRole;
  label: string;
  summary: string;
}[] = [
  {
    value: "owner",
    label: "Proprietário",
    summary:
      "Gerencia integrações, pessoas e convites, e vê métricas e extrato.",
  },
  {
    value: "developer",
    label: "Desenvolvedor",
    summary:
      "Gerencia credenciais e webhooks e vê métricas, sem acesso ao extrato.",
  },
  {
    value: "financial_reader",
    label: "Financeiro (leitura)",
    summary: "Vê métricas e extrato, sem acesso a credenciais e webhooks.",
  },
];

export function roleLabel(role: string | null | undefined): string {
  if (role == null) return "—";
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

export type RoleAccess = {
  integrations: boolean;
  metrics: boolean;
  statement: boolean;
  people: boolean;
};

const ACCESS: Record<PartnerRole, RoleAccess> = {
  owner: { integrations: true, metrics: true, statement: true, people: true },
  developer: {
    integrations: true,
    metrics: true,
    statement: false,
    people: false,
  },
  financial_reader: {
    integrations: false,
    metrics: true,
    statement: true,
    people: false,
  },
};

const NONE: RoleAccess = {
  integrations: false,
  metrics: false,
  statement: false,
  people: false,
};

/** Mirrors the backend matrix; the server remains the authority (403 partner.role_denied). */
export function roleAccess(role: string | null | undefined): RoleAccess {
  return (role && ACCESS[role as PartnerRole]) || NONE;
}

/**
 * Session roles arrive only from backend releases that know the matrix. An absent
 * field keeps the integration screens (the server still decides); `null` means
 * the selected organization is no longer available.
 */
export function memberAccess(role: string | null | undefined): RoleAccess {
  if (role === undefined) return { ...NONE, integrations: true };
  return roleAccess(role);
}
