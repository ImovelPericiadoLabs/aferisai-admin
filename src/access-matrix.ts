export type Role = "viewer" | "manager" | "administrator" | "financial";

export const ROLES: Role[] = [
  "viewer",
  "manager",
  "administrator",
  "financial",
];

export type Capability = {
  id: string;
  area: string;
  label: string;
  roles: Role[];
};

const readers: Role[] = ["viewer", "manager", "administrator"];
const managers: Role[] = ["manager", "administrator"];
const adminOnly: Role[] = ["administrator"];

export const CAPABILITIES: Capability[] = [
  {
    id: "partner-view",
    area: "Parceiros",
    label: "Ver organizações e aplicações",
    roles: readers,
  },
  {
    id: "partner-edit",
    area: "Parceiros",
    label: "Editar perfil, permissões, credenciais, webhooks e redirects",
    roles: managers,
  },
  {
    id: "partner-invite",
    area: "Parceiros",
    label: "Convidar pessoa do parceiro",
    roles: adminOnly,
  },
  {
    id: "connection-revoke",
    area: "Parceiros",
    label: "Revogar conexão de titular",
    roles: managers,
  },
  {
    id: "users-list",
    area: "Contas",
    label: "Listar contas de usuário",
    roles: managers,
  },
  {
    id: "members-list",
    area: "Contas",
    label: "Listar membros da equipe",
    roles: adminOnly,
  },
  {
    id: "commercial-rules",
    area: "Comercial",
    label: "Regras comerciais e promoções",
    roles: adminOnly,
  },
  {
    id: "analysis-review",
    area: "Análise",
    label: "Revisão humana de análise",
    roles: managers,
  },
  {
    id: "exception-claim",
    area: "Financeiro",
    label: "Assumir caso de exceção",
    roles: ["manager", "administrator", "financial"],
  },
  {
    id: "exception-reassign",
    area: "Financeiro",
    label: "Reatribuir caso de exceção",
    roles: adminOnly,
  },
  {
    id: "exception-propose",
    area: "Financeiro",
    label: "Propor solução de exceção",
    roles: managers,
  },
  {
    id: "exception-confirm",
    area: "Financeiro",
    label: "Confirmar e executar estorno ou correção",
    roles: ["financial"],
  },
  {
    id: "provider-accounts",
    area: "Plataforma",
    label: "Contas de provedor de IA",
    roles: adminOnly,
  },
  {
    id: "own-passkeys",
    area: "Minha conta",
    label: "Chaves de acesso e sessão próprias",
    roles: ROLES,
  },
];

export function capabilitiesFor(role: Role): Capability[] {
  return CAPABILITIES.filter((item) => item.roles.includes(role));
}

export function groupByArea(
  items: Capability[],
): { area: string; items: Capability[] }[] {
  const groups: { area: string; items: Capability[] }[] = [];
  for (const item of items) {
    const existing = groups.find((group) => group.area === item.area);
    if (existing) existing.items.push(item);
    else groups.push({ area: item.area, items: [item] });
  }
  return groups;
}

export function canEditApplicationPermissions(role: string): boolean {
  return role === "manager" || role === "administrator";
}
