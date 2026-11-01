import type { TeamMember } from "./api";
import { homePageFor, showsOverview } from "./home-page";

type Role = TeamMember["role"];

export type Page =
  | "overview"
  | "reports"
  | "executive"
  | "organizations"
  | "commercial"
  | "promotions"
  | "requests"
  | "sources"
  | "analyses"
  | "financial"
  | "commissions"
  | "access"
  | "reconciliation"
  | "onr-review"
  | "registry-requests"
  | "connections"
  | "users"
  | "team-members"
  | "analysis-providers"
  | "operations"
  | "registry-suppliers"
  | "passkeys"
  | "maintenance";
export type HiddenPage = "design-system" | "integration-map";

export const nav: { page: Page; label: string; detail: string }[] = [
  { page: "overview", label: "Visão geral", detail: "Início" },
  {
    page: "executive",
    label: "Painel executivo",
    detail: "Receita e operação",
  },
  { page: "reports", label: "Relatórios", detail: "Por tema, com exportação" },
  { page: "organizations", label: "Parceiros", detail: "Parcerias ativas" },
  {
    page: "commercial",
    label: "Regras comerciais",
    detail: "Regras e versões",
  },
  { page: "promotions", label: "Promoções", detail: "Cupons e links" },
  { page: "requests", label: "Pedidos", detail: "Triagem operacional" },
  { page: "sources", label: "Fontes", detail: "Antes da cobrança" },
  { page: "analyses", label: "Análises", detail: "Conferência interna" },
  {
    page: "operations",
    label: "Estado do sistema",
    detail: "Serviços e capacidade",
  },
  { page: "financial", label: "Exceções", detail: "Decisão financeira" },
  { page: "commissions", label: "Repasses", detail: "Comissões e pagamentos" },
  { page: "connections", label: "Conexões", detail: "Consentimentos ativos" },
  { page: "users", label: "Usuários", detail: "Contas da plataforma" },
  { page: "team-members", label: "Equipe", detail: "Membros internos" },
  {
    page: "analysis-providers",
    label: "Provedores IA",
    detail: "Contas e limites",
  },
  {
    page: "registry-suppliers",
    label: "Fornecedores",
    detail: "Contas registrais",
  },
  { page: "passkeys", label: "Minhas chaves", detail: "Acesso à conta" },
  {
    page: "maintenance",
    label: "Manutenção",
    detail: "Disponibilidade do site",
  },
  { page: "access", label: "Permissões", detail: "Estrutura de acesso" },
  {
    page: "reconciliation",
    label: "Conciliação",
    detail: "Submissões incertas",
  },
  { page: "onr-review", label: "Prévia ONR", detail: "Revisão de prévia" },
  {
    page: "registry-requests",
    label: "Pedidos registrais",
    detail: "Todos os pedidos",
  },
];

export const navGroups: { title: string; pages: Page[] }[] = [
  { title: "Painel", pages: ["overview", "executive", "reports"] },
  {
    title: "Operação",
    pages: [
      "requests",
      "registry-requests",
      "sources",
      "analyses",
      "operations",
      "reconciliation",
      "onr-review",
    ],
  },
  {
    title: "Comercial",
    pages: [
      "organizations",
      "connections",
      "users",
      "commercial",
      "promotions",
    ],
  },
  { title: "Financeiro", pages: ["financial", "commissions"] },
  { title: "Configurações", pages: ["maintenance"] },
];

export type NavItem = (typeof nav)[number];

export function pageFromHash(): Page | HiddenPage {
  const value = window.location.hash.slice(1);
  return value === "organizations" ||
    value === "reports" ||
    value === "executive" ||
    value === "commercial" ||
    value === "promotions" ||
    value === "requests" ||
    value === "sources" ||
    value === "analyses" ||
    value === "financial" ||
    value === "commissions" ||
    value === "access" ||
    value === "reconciliation" ||
    value === "onr-review" ||
    value === "registry-requests" ||
    value === "connections" ||
    value === "users" ||
    value === "team-members" ||
    value === "analysis-providers" ||
    value === "operations" ||
    value === "registry-suppliers" ||
    value === "passkeys" ||
    value === "maintenance" ||
    value === "design-system" ||
    value === "integration-map"
    ? value
    : "overview";
}

export function canReviewRole(role: Role): boolean {
  return role === "administrator" || role === "manager";
}

/** Navigation entries the given role may see. */
export function visibleNavFor(role: Role): NavItem[] {
  const canReview = canReviewRole(role);
  const isFinancial = role === "financial";
  return nav.filter((item) =>
    item.page === "overview" && !showsOverview(role)
      ? false
      : isFinancial
        ? item.page === "overview" ||
          item.page === "reports" ||
          item.page === "financial" ||
          item.page === "commissions" ||
          item.page === "passkeys"
        : (item.page !== "financial" || canReview) &&
          item.page !== "commissions" &&
          (item.page !== "requests" || canReview) &&
          (item.page !== "sources" || canReview) &&
          (item.page !== "analyses" || canReview) &&
          (item.page !== "commercial" || role === "administrator") &&
          (item.page !== "promotions" || role === "administrator") &&
          (item.page !== "reconciliation" || canReview) &&
          (item.page !== "onr-review" || canReview) &&
          (item.page !== "registry-requests" || canReview) &&
          (item.page !== "connections" || canReview) &&
          (item.page !== "users" || canReview) &&
          (item.page !== "team-members" || role === "administrator") &&
          (item.page !== "analysis-providers" || role === "administrator") &&
          (item.page !== "operations" || role === "administrator") &&
          (item.page !== "registry-suppliers" || role === "administrator") &&
          (item.page !== "executive" || role === "administrator") &&
          (item.page !== "maintenance" || role === "administrator"),
  );
}

/** The page actually shown: falls back to the role's home when not allowed. */
export function resolveCurrentPage(
  page: Page | HiddenPage,
  visibleNav: NavItem[],
  role: Role,
): Page | HiddenPage {
  return visibleNav.some((item) => item.page === page) ||
    ((page === "design-system" || page === "integration-map") &&
      role === "administrator")
    ? page
    : homePageFor(role);
}

/** Home page plus the shortcuts shown in the mobile bottom bar. */
export function bottomNavFor(
  role: Role,
  visibleNav: NavItem[],
): { home: Page; items: Page[] } {
  const canReview = canReviewRole(role);
  const isFinancial = role === "financial";
  const home: Page = showsOverview(role) ? "overview" : homePageFor(role);
  const mobileItems: Page[] = isFinancial
    ? [home, "reports", "financial", "commissions"]
    : canReview
      ? [home, "requests", "reports", "financial"]
      : [home, "reports"];
  return {
    home,
    items: mobileItems.filter((item) =>
      visibleNav.some((navItem) => navItem.page === item),
    ),
  };
}
