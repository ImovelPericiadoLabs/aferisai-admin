import type { PaymentExceptionCase } from "./api";
import { analysisWorkStatusLabel } from "./display-labels";
import { causeOf } from "./exception-causes";
import { nextAction, stageOf } from "./exception-model";
import { outcomeLabel } from "./exception-panel-model";

export { causeOf };

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const money = (cents: number) => brl.format(cents / 100).replaceAll(" ", " ");
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/* ── A document of the purchase ───────────────────────────────────────────────────────── */

export type DocState = "delivered" | "waiting" | "problem";

const DELIVERY: Record<string, { label: string; state: DocState }> = {
  confirmed: { label: "Entregue", state: "delivered" },
  pending: { label: "Na fila para envio", state: "waiting" },
  awaiting_input: { label: "Aguardando informações", state: "waiting" },
  dispatched: { label: "Enviado ao fornecedor", state: "waiting" },
  unavailable: { label: "Indisponível", state: "problem" },
  failed: { label: "Falhou", state: "problem" },
  unknown: { label: "Resultado incerto", state: "problem" },
};

export function deliveryOf(status: string | null | undefined): {
  label: string;
  state: DocState;
} {
  if (status === null || status === undefined)
    return { label: "Sem estado", state: "waiting" };
  return (
    DELIVERY[status] ?? { label: "Estado não identificado", state: "waiting" }
  );
}

export type AnalysisState = "done" | "running" | "problem" | "none";

function analysisOf(workStatus: string | null): {
  label: string;
  state: AnalysisState;
} {
  if (workStatus === null)
    return { label: "Análise ainda não criada", state: "none" };
  if (workStatus === "completed")
    return { label: analysisWorkStatusLabel(workStatus), state: "done" };
  if (workStatus === "failed" || workStatus === "unknown")
    return { label: analysisWorkStatusLabel(workStatus), state: "problem" };
  return { label: analysisWorkStatusLabel(workStatus), state: "running" };
}

export type JourneyDocument = {
  ordinal: number;
  title: string;
  delivery: { label: string; state: DocState };
  analysis: { label: string; state: AnalysisState };
  workId: string | null;
  requestId: string | null;
  errorCode: string | null;
};

/* ── The whole purchase ───────────────────────────────────────────────────────────────── */

export type StageState = "done" | "current" | "problem" | "pending";

export type JourneyStage = {
  id: "payment" | "documents" | "analysis";
  title: string;
  detail: string;
  state: StageState;
};

export type Journey = {
  /** `registry`: a purchase of one or more documents; `upload`: a file the customer sent. */
  kind: "registry" | "upload";
  total: number;
  delivered: number;
  waiting: number;
  problems: number;
  analysesDone: number;
  analysesRunning: number;
  analysesProblem: number;
  analysesNotCreated: number;
  headline: string;
  documents: JourneyDocument[];
  stages: JourneyStage[];
};

function paymentDetail(item: PaymentExceptionCase) {
  const method =
    item.funding_source === "credits"
      ? "Créditos"
      : item.funding_source === "pix"
        ? "PIX"
        : null;
  return method
    ? `${method} · ${money(item.amount_cents)}`
    : money(item.amount_cents);
}

export function journeyOf(item: PaymentExceptionCase): Journey {
  const payment: JourneyStage = {
    id: "payment",
    title: "Pagamento",
    detail: paymentDetail(item),
    state: "done",
  };
  const items = item.affected_items ?? [];
  if (items.length === 0)
    return {
      kind: "upload",
      total: 1,
      delivered: 1,
      waiting: 0,
      problems: 0,
      analysesDone: 0,
      analysesRunning: 0,
      analysesProblem: 0,
      analysesNotCreated: 0,
      headline: "Arquivo enviado pelo cliente.",
      documents: [
        {
          ordinal: 1,
          title: "Arquivo do cliente",
          delivery: {
            label: "Arquivo enviado pelo cliente",
            state: "delivered",
          },
          analysis: { label: "Veja em Análises", state: "none" },
          workId: item.work_id,
          requestId: item.request_id ?? null,
          errorCode: null,
        },
      ],
      stages: [payment],
    };

  const documents: JourneyDocument[] = [...items]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((entry) => ({
      ordinal: entry.ordinal,
      title: `Documento ${entry.ordinal}`,
      delivery: deliveryOf(entry.item_status),
      analysis: analysisOf(entry.work_status),
      workId: entry.work_id,
      requestId: entry.request_id ?? null,
      errorCode: entry.error_code,
    }));
  const count = (test: (doc: JourneyDocument) => boolean) =>
    documents.filter(test).length;
  const total = documents.length;
  const delivered = count((doc) => doc.delivery.state === "delivered");
  const waiting = count((doc) => doc.delivery.state === "waiting");
  const problems = count((doc) => doc.delivery.state === "problem");
  const analysesDone = count((doc) => doc.analysis.state === "done");
  const analysesRunning = count((doc) => doc.analysis.state === "running");
  const analysesProblem = count((doc) => doc.analysis.state === "problem");
  const analysesNotCreated = count((doc) => doc.analysis.state === "none");

  const parts: string[] = [];
  if (delivered === total)
    parts.push(total === 1 ? "entregue" : "todos entregues");
  else {
    if (delivered > 0) parts.push(plural(delivered, "entregue", "entregues"));
    if (waiting > 0) parts.push(`${waiting} aguardando o fornecedor`);
    if (problems > 0) parts.push(`${problems} com problema`);
  }
  const headline = `Compra de ${plural(total, "documento", "documentos")}: ${parts.join(", ")}.`;

  const documentsState: StageState =
    delivered === total ? "done" : problems > 0 ? "problem" : "current";
  const analysisState: StageState =
    analysesDone === total
      ? "done"
      : analysesProblem > 0
        ? "problem"
        : delivered === total
          ? "current"
          : "pending";

  return {
    kind: "registry",
    total,
    delivered,
    waiting,
    problems,
    analysesDone,
    analysesRunning,
    analysesProblem,
    analysesNotCreated,
    headline,
    documents,
    stages: [
      payment,
      {
        id: "documents",
        title: "Documentos",
        detail: `${delivered} de ${total} entregues`,
        state: documentsState,
      },
      {
        id: "analysis",
        title: "Análises",
        detail: `${analysesDone} de ${total} concluídas`,
        state: analysisState,
      },
    ],
  };
}

/* ── Whose turn it is ────────────────────────────────────────────────────────────────── */

export type Turn = {
  role: "Gestor" | "Financeiro" | null;
  /** The person who took this step, when somebody did. */
  person: string | null;
  what: string;
  done: boolean;
};

function executionStep(item: PaymentExceptionCase): string {
  if (item.resolution === "refund") {
    const credits = item.funding_source === "credits";
    if (item.execution_status)
      return credits
        ? "Conciliar a devolução dos créditos."
        : "Conciliar o estorno com o Asaas.";
    return credits
      ? "Devolver os créditos ao cliente."
      : "Iniciar o estorno integral no Asaas.";
  }
  const docs = journeyOf(item).documents;
  const stuck = docs.filter((doc) => doc.delivery.state === "problem").length;
  if (stuck > 0)
    return `Recuperar ${plural(stuck, "documento pendente", "documentos pendentes")} junto ao fornecedor.`;
  const pending = docs.filter((doc) => doc.delivery.state === "waiting").length;
  if (pending > 0)
    return `Aguardar o fornecedor entregar ${plural(pending, "documento", "documentos")}.`;
  return "Verificar a entrega corrigida.";
}

export function turnOf(
  item: PaymentExceptionCase,
  person: (id: string | null) => string,
): Turn {
  const stage = stageOf(item);
  if (stage === "done")
    return {
      role: null,
      person: null,
      what: `Nada a fazer: caso concluído (${outcomeLabel(item.resolution)}).`,
      done: true,
    };
  if (stage === "awaiting-proposal") {
    const owner = item.manager_assignee_id;
    return {
      role: "Gestor",
      person: owner ? person(owner) : null,
      what: owner
        ? "Propor: corrigir a entrega ou reembolsar."
        : "Assumir o caso e propor: corrigir a entrega ou reembolsar.",
      done: false,
    };
  }
  const owner = item.financial_assignee_id;
  if (stage === "awaiting-financial")
    return {
      role: "Financeiro",
      person: owner ? person(owner) : null,
      what: `Confirmar a decisão financeira. Proposta do gestor: ${outcomeLabel(item.proposed_resolution)}.`,
      done: false,
    };
  return {
    role: "Financeiro",
    person: owner ? person(owner) : null,
    what: executionStep(item),
    done: false,
  };
}

/** True when the viewer has something to do now: the step is theirs by role and the screen offers an action. */
export function isMyTurn(
  item: PaymentExceptionCase,
  role: Parameters<typeof nextAction>[1],
  memberId: string,
): boolean {
  const turn = turnOf(item, () => "");
  if (turn.done || turn.role === null) return false;
  const byRole =
    turn.role === "Gestor"
      ? role === "manager" || role === "administrator"
      : role === "financial" || role === "administrator";
  if (!byRole) return false;
  const action = nextAction(item, role, memberId);
  return action.kind !== "wait" && action.kind !== "none";
}
