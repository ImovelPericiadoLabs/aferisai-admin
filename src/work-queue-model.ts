import type {
  AttentionPage,
  OnrPreviewAttentionItem,
  PaymentExceptionCase,
  PendingSourcePage,
  UncertainSubmissionItem,
} from "./api";
import { causeOf, isMyTurn, journeyOf, turnOf } from "./case-journey-model";
import { analysisWorkStatusLabel } from "./display-labels";
import { dueState, stageOf } from "./exception-model";
import { railAt, railOf, type RailStep } from "./rail-model";
import type { Page } from "./team-nav-model";

/**
 * Everything a person may have to do, from every queue, as one list. Each queue keeps its own
 * screen for the detailed work; this model only decides what to show, in what order and where
 * the button leads. Nothing here shows a technical code or an id.
 */
export type TaskKind = "case" | "send" | "preview" | "analysis" | "source";

export const KIND_LABEL: Record<TaskKind, string> = {
  case: "Caso pago sem entrega",
  send: "Envio ao fornecedor",
  preview: "Prévia do ONR",
  analysis: "Análise",
  source: "Arquivo do cliente",
};

export type TaskTrack = {
  total: number;
  delivered: number;
  waiting: number;
  problems: number;
};

export type Task = {
  id: string;
  kind: TaskKind;
  title: string;
  subtitle: string;
  /** "mine": needs the viewer now. "waiting": somebody else has to act. */
  lane: "mine" | "waiting";
  overdue: boolean;
  dueAt: string | null;
  since: string | null;
  track: TaskTrack | null;
  /** Who has to act, in words. */
  who: string | null;
  action: string;
  open: { page: Page; id: string | null };
  /** The customer, when the queue knows who it is. */
  customer: string | null;
  /** The stops of the purchase and where this task sits. */
  rail: RailStep[];
  /** The whole case, for the tasks that can be worked on right here. */
  exception: PaymentExceptionCase | null;
};

type Role = Parameters<typeof isMyTurn>[1];

const PROVIDER: Record<string, string> = {
  infosimples: "InfoSimples",
  onr: "ONR (RI Digital)",
};

export const providerLabel = (provider: string) =>
  PROVIDER[provider] ?? "Fornecedor";

/** The short title of a financial case, by the step it is waiting on. */
function caseTitle(item: PaymentExceptionCase): string {
  const stage = stageOf(item);
  if (stage === "awaiting-proposal") return "Propor a solução";
  if (stage === "awaiting-financial") return "Confirmar a decisão";
  if (item.resolution === "refund")
    return item.funding_source === "credits"
      ? "Devolver os créditos"
      : "Estornar o pagamento";
  const stuck = journeyOf(item).problems;
  return stuck > 0 ? "Recuperar documentos" : "Conferir a entrega";
}

export function caseTask(
  item: PaymentExceptionCase,
  role: Role,
  memberId: string,
  person: (id: string | null) => string,
  now: number,
): Task {
  const journey = journeyOf(item);
  const turn = turnOf(item, person);
  const mine = isMyTurn(item, role, memberId);
  const due = dueState(item.due_at, now);
  const customer =
    item.customer_name ?? item.customer_email ?? "Cliente sem nome";
  return {
    id: `case-${item.id}`,
    kind: "case",
    title: caseTitle(item),
    subtitle: `${customer} · ${causeOf(item.reason_code).title}`,
    lane: mine ? "mine" : "waiting",
    overdue: due.overdue && stageOf(item) !== "done",
    dueAt: item.due_at,
    since: item.opened_at,
    track:
      journey.kind === "registry"
        ? {
            total: journey.total,
            delivered: journey.delivered,
            waiting: journey.waiting,
            problems: journey.problems,
          }
        : null,
    who: turn.role,
    action: mine ? "Decidir" : "Ver caso",
    open: { page: "financial", id: item.id },
    customer: item.customer_name ?? item.customer_email ?? null,
    rail:
      journey.kind === "registry" ? railOf(journey) : railAt("documents", true),
    exception: item,
  };
}

export function sendTask(item: UncertainSubmissionItem): Task | null {
  if (item.reconciliation_status !== "action_required") return null;
  return {
    id: `send-${item.item_id}`,
    kind: "send",
    title: "Conferir o envio",
    subtitle: `${providerLabel(item.provider)} · sem resposta confirmada`,
    lane: "mine",
    overdue: false,
    dueAt: null,
    since: item.attempted_at,
    track: null,
    who: "Equipe",
    action: "Conferir",
    open: { page: "reconciliation", id: null },
    customer: null,
    rail: railAt("documents", true),
    exception: null,
  };
}

export function previewTask(item: OnrPreviewAttentionItem): Task {
  return {
    id: `preview-${item.attempt_id}`,
    kind: "preview",
    title: "Revisar a prévia",
    subtitle: item.latest_decision
      ? "Já tem revisão anterior"
      : "Ainda sem revisão",
    lane: "mine",
    overdue: false,
    dueAt: null,
    since: item.started_at,
    track: null,
    who: "Equipe",
    action: "Revisar",
    open: { page: "onr-review", id: null },
    customer: null,
    rail: railAt("order", false),
    exception: null,
  };
}

export function analysisTask(item: AttentionPage["items"][number]): Task {
  return {
    id: `analysis-${item.work_id}`,
    kind: "analysis",
    title: "Revisar a análise",
    subtitle: analysisWorkStatusLabel(item.status),
    lane: "mine",
    overdue: false,
    dueAt: null,
    since: item.finished_at,
    track: null,
    who: "Equipe",
    action: "Revisar",
    open: { page: "analyses", id: item.work_id },
    customer: null,
    rail: railAt(
      "analysis",
      item.status === "failed" || item.status === "unknown",
    ),
    exception: null,
  };
}

export function sourceTask(
  item: PendingSourcePage["items"][number],
  now: number,
): Task {
  return {
    id: `source-${item.request_id}`,
    kind: "source",
    title: "Classificar o arquivo",
    subtitle: "Antes da cobrança",
    lane: "mine",
    overdue: Date.parse(item.expires_at) < now,
    dueAt: item.expires_at,
    since: item.created_at,
    track: null,
    who: "Equipe",
    action: "Classificar",
    open: { page: "sources", id: item.request_id },
    customer: null,
    rail: railAt("order", false),
    exception: null,
  };
}

/** Yours first, then the late ones, then the ones closest to their deadline, then the newest. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.lane !== b.lane) return a.lane === "mine" ? -1 : 1;
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    const ad = a.dueAt ? Date.parse(a.dueAt) : Infinity;
    const bd = b.dueAt ? Date.parse(b.dueAt) : Infinity;
    if (ad !== bd) return ad - bd;
    return (Date.parse(b.since ?? "") || 0) - (Date.parse(a.since ?? "") || 0);
  });
}

export type TaskFilter = "mine" | "overdue" | "waiting" | "all";

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  if (filter === "mine") return tasks.filter((task) => task.lane === "mine");
  if (filter === "overdue") return tasks.filter((task) => task.overdue);
  if (filter === "waiting")
    return tasks.filter((task) => task.lane === "waiting");
  return tasks;
}

export function countTasks(tasks: Task[]): Record<TaskFilter, number> {
  return {
    mine: filterTasks(tasks, "mine").length,
    overdue: filterTasks(tasks, "overdue").length,
    waiting: filterTasks(tasks, "waiting").length,
    all: tasks.length,
  };
}
