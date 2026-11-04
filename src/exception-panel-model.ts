import type { PaymentExceptionCase, TeamMember } from "./api";
import { statusLabel } from "./display-labels";

export type Role = TeamMember["role"];
export type Asking = null | "propose" | "confirm" | "refund" | "reassign";
export type ExecuteAction =
  | "refund-attempts"
  | "refund-reconciliations"
  | "correction-verifications"
  | "delivery-retries";

export const outcomeLabel = (value: "correct" | "refund" | null) =>
  value === "correct"
    ? "Corrigir entrega"
    : value === "refund"
      ? "Reembolsar"
      : "A decidir";

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function exceptionSteps(
  item: PaymentExceptionCase,
  person: (id: string | null) => string,
) {
  return [
    {
      title: "Bloqueio aberto",
      detail: dateTime.format(new Date(item.opened_at)),
      state: "done",
    },
    {
      title: "Proposta do gestor",
      detail: item.latest_proposal_id
        ? `${outcomeLabel(item.proposed_resolution)} · ${person(item.proposal_actor_id)}${item.proposal_at ? ` · ${dateTime.format(new Date(item.proposal_at))}` : ""}`
        : "Aguardando proposta",
      note: item.proposal_reason,
      state: item.latest_proposal_id ? "done" : "current",
    },
    {
      title: "Decisão do financeiro",
      detail: item.financial_decision_id
        ? outcomeLabel(item.resolution)
        : item.latest_proposal_id
          ? "Aguardando confirmação"
          : "Depois da proposta",
      state: item.financial_decision_id
        ? "done"
        : item.latest_proposal_id
          ? "current"
          : "pending",
    },
    {
      title: "Execução",
      detail: item.financial_decision_id
        ? item.execution_status
          ? statusLabel(item.execution_status)
          : "A iniciar"
        : "Depois da decisão",
      state:
        item.execution_status === "done"
          ? "done"
          : item.financial_decision_id
            ? "current"
            : "pending",
    },
  ] as const;
}
