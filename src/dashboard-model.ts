import type { DashboardMetrics, TeamMember } from "./api";

export type DashboardRole = TeamMember["role"];
export type DashboardDestination =
  | "overview"
  | "reports"
  | "analyses"
  | "registry-requests"
  | "financial"
  | "commissions";

export type DashboardGroupKey = keyof DashboardMetrics;
export type DashboardTone = "blue" | "green" | "amber" | "red" | "slate";

export type DashboardDatum = {
  label: string;
  value: number;
  tone: DashboardTone;
};

export type DashboardGroup = {
  key: DashboardGroupKey;
  title: string;
  description: string;
  definition: string;
  icon: "analysis" | "registry" | "payment" | "commission";
  items: DashboardDatum[];
  destination?: DashboardDestination;
};

/** Limit displayed groups to the authenticated role even if a stale response contains more. */
export function groupsForRole(
  data: DashboardMetrics,
  role: DashboardRole,
): DashboardGroup[] {
  const groups: DashboardGroup[] = [];
  if (role !== "financial" && data.analyses) {
    groups.push({
      key: "analyses",
      title: "Análises",
      description: "Situação das análises registradas",
      definition:
        "Na fila inclui análises pendentes e bloqueadas. Com erro inclui falhas e resultados incertos. Cada número é uma contagem atual por estado, sem filtro de período.",
      icon: "analysis",
      destination: "analyses",
      items: [
        { label: "Na fila", value: data.analyses.queued, tone: "slate" },
        { label: "Em execução", value: data.analyses.running, tone: "blue" },
        { label: "Concluídas", value: data.analyses.completed, tone: "green" },
        { label: "Com erro", value: data.analyses.error, tone: "red" },
      ],
    });
  }
  if (
    (role === "manager" || role === "administrator") &&
    data.registry_requests
  ) {
    groups.push({
      key: "registry_requests",
      title: "Pedidos registrais",
      description: "Acompanhamento da aquisição externa",
      definition:
        "Pendentes reúne pedidos criados e aguardando informação. Com erro ou incertos reúne falhas, resultados incertos e indisponibilidade. Cada número é uma contagem atual por estado.",
      icon: "registry",
      destination: "registry-requests",
      items: [
        {
          label: "Pendentes",
          value: data.registry_requests.pending,
          tone: "slate",
        },
        {
          label: "Despachados",
          value: data.registry_requests.dispatched,
          tone: "blue",
        },
        {
          label: "Confirmados",
          value: data.registry_requests.confirmed,
          tone: "green",
        },
        {
          label: "Com erro ou incertos",
          value: data.registry_requests.error,
          tone: "red",
        },
      ],
    });
  }
  if ((role === "financial" || role === "administrator") && data.payments) {
    groups.push({
      key: "payments",
      title: "Pagamentos",
      description: "Situação das cobranças PIX",
      definition:
        "Aguardando PIX conta cobranças preparadas; recebidos conta pagamentos confirmados; em revisão conta exceções pendentes. Não representa valor em reais nem receita.",
      icon: "payment",
      destination: role === "financial" ? "financial" : undefined,
      items: [
        {
          label: "Aguardando PIX",
          value: data.payments.prepared,
          tone: "amber",
        },
        { label: "Recebidos", value: data.payments.received, tone: "green" },
        { label: "Em revisão", value: data.payments.review, tone: "red" },
      ],
    });
  }
  if ((role === "financial" || role === "administrator") && data.commissions) {
    groups.push({
      key: "commissions",
      title: "Comissões",
      description: "Obrigações comerciais por estado",
      definition:
        "Provisionadas aguardam conclusão; a repassar estão devidas; repassadas têm confirmação registrada. Estes números contam registros, não valores em reais.",
      icon: "commission",
      destination: role === "financial" ? "commissions" : undefined,
      items: [
        {
          label: "Provisionadas",
          value: data.commissions.provisional,
          tone: "amber",
        },
        { label: "A repassar", value: data.commissions.owed, tone: "red" },
        { label: "Repassadas", value: data.commissions.settled, tone: "green" },
      ],
    });
  }
  return groups;
}

export function groupSum(group: DashboardGroup): number {
  return group.items.reduce((sum, item) => sum + item.value, 0);
}
