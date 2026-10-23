import type { PaymentExceptionCase, TeamMember } from "./api";

type Role = TeamMember["role"];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function span(ms: number): string {
  if (ms >= DAY) return `${Math.floor(ms / DAY)} d`;
  if (ms >= HOUR) return `${Math.floor(ms / HOUR)} h`;
  return ms < MIN ? "menos de 1 min" : `${Math.floor(ms / MIN)} min`;
}

export function dueState(
  dueAt: string,
  now: number = Date.now(),
): { tone: "danger" | "warning" | "neutral"; label: string; overdue: boolean } {
  const diff = Date.parse(dueAt) - now;
  if (diff < 0)
    return {
      tone: "danger",
      label: `Atrasado há ${span(-diff)}`,
      overdue: true,
    };
  return {
    tone: diff < DAY ? "warning" : "neutral",
    label: `Vence em ${span(diff)}`,
    overdue: false,
  };
}

export type CaseStage =
  "awaiting-proposal" | "awaiting-financial" | "executing" | "done";

export const stageLabel: Record<CaseStage, string> = {
  "awaiting-proposal": "Aguardando proposta",
  "awaiting-financial": "Aguardando financeiro",
  executing: "Em execução",
  done: "Concluído",
};

export function stageOf(item: PaymentExceptionCase): CaseStage {
  if (item.financial_decision_id)
    return item.execution_status === "done" ? "done" : "executing";
  return item.latest_proposal_id ? "awaiting-financial" : "awaiting-proposal";
}

export type NextAction =
  | { kind: "claim" | "propose" | "confirm" | "none" }
  | { kind: "start-refund" | "reconcile-refund" | "verify-correction" }
  | { kind: "wait"; reason: string };

const wait = (reason: string): NextAction => ({ kind: "wait", reason });

export function nextAction(
  item: PaymentExceptionCase,
  role: Role,
  memberId: string,
): NextAction {
  if (role === "viewer") return wait("Seu perfil só consulta.");
  if (item.financial_decision_id) {
    if (item.execution_status === "done") return { kind: "none" };
    if (role !== "financial" || item.financial_assignee_id !== memberId)
      return wait("A execução é feita pela pessoa responsável no financeiro.");
    if (item.resolution === "refund")
      return item.execution_status
        ? { kind: "reconcile-refund" }
        : { kind: "start-refund" };
    return { kind: "verify-correction" };
  }
  if (role === "financial") {
    if (!item.latest_proposal_id) return wait("Aguardando proposta do gestor.");
    if (!item.financial_assignee_id) return { kind: "claim" };
    return item.financial_assignee_id === memberId
      ? { kind: "confirm" }
      : wait("O caso foi atribuído a outra pessoa do seu papel.");
  }
  if (!item.manager_assignee_id) return { kind: "claim" };
  return item.manager_assignee_id === memberId
    ? { kind: "propose" }
    : wait("O caso foi atribuído a outra pessoa do seu papel.");
}

export function reassignBlock(
  item: PaymentExceptionCase,
  role: Role,
  target: "manager" | "financial",
): string | null {
  if (role !== "administrator")
    return "Somente administradores reatribuem casos.";
  if (item.financial_decision_id) return "O caso já tem decisão financeira.";
  if (target === "manager" && item.latest_proposal_id)
    return "O gestor não pode mudar depois da proposta.";
  return null;
}

export function sortByUrgency(
  items: PaymentExceptionCase[],
  now: number = Date.now(),
): PaymentExceptionCase[] {
  void now;
  return [...items].sort((a, b) => {
    const aDone = stageOf(a) === "done" ? 1 : 0;
    const bDone = stageOf(b) === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return Date.parse(a.due_at) - Date.parse(b.due_at);
  });
}

export type CaseFilter = "all" | "overdue" | "mine" | "executing";

export function filterCases(
  items: PaymentExceptionCase[],
  filter: CaseFilter,
  memberId: string,
  now: number = Date.now(),
): PaymentExceptionCase[] {
  if (filter === "overdue")
    return items.filter(
      (item) => stageOf(item) !== "done" && dueState(item.due_at, now).overdue,
    );
  if (filter === "mine")
    return items.filter(
      (item) =>
        item.manager_assignee_id === memberId ||
        item.financial_assignee_id === memberId,
    );
  if (filter === "executing")
    return items.filter((item) => stageOf(item) === "executing");
  return items;
}
