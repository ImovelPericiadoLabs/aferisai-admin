import type { RequestOperationPage } from "./api";
import type { Kpi, TimelineStep } from "./OpsParts";
import type { RowTone } from "./OpsTable";

export type RequestRow = RequestOperationPage["items"][number];
export type RequestViewId =
  "all" | "attention" | "awaiting_payment" | "in_analysis" | "done";

export const REQUEST_VIEWS: { id: RequestViewId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "attention", label: "Com pendência" },
  { id: "awaiting_payment", label: "Aguardando pagamento" },
  { id: "in_analysis", label: "Em análise" },
  { id: "done", label: "Concluídos" },
];

export const documentLabels = {
  available: "Original disponível",
  expired: "Original vencido",
  purged: "Original eliminado",
} as const;

export function paymentLabel(item: RequestRow): string {
  if (item.charge_attempt === "unknown") return "Cobrança em conciliação";
  if (item.payment_status === "received") return "Pagamento confirmado";
  if (item.payment_status === "review") return "Pagamento em conferência";
  if (item.payment_status === "prepared")
    return item.charge_attempt === "not_sent"
      ? "Cobrança ainda não enviada"
      : "Cobrança pendente";
  return "Sem intenção PIX";
}

export function admissionLabel(item: RequestRow): string {
  const labels: Record<string, string> = {
    eligible: "Arquivo no limite técnico",
    unsupported: "Arquivo fora do limite técnico",
    non_registry: "Fonte fora da oferta",
  };
  return item.admission_outcome
    ? (labels[item.admission_outcome] ?? "Preflight em conferência")
    : "Preflight ausente";
}

export function workLabel(item: RequestRow): string {
  const labels: Record<string, string> = {
    blocked: "Trabalho bloqueado",
    pending: "Na fila",
    running: "Em processamento",
    suspended: "Trabalho suspenso",
    unknown: "Resultado externo incerto",
    failed: "Falha de processamento",
    completed: "Processamento concluído",
  };
  return item.work_status
    ? (labels[item.work_status] ?? "Estado em conferência")
    : "Ainda sem trabalho";
}

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export const paymentTone = (item: RequestRow): BadgeTone =>
  item.charge_attempt === "unknown" || item.payment_status === "review"
    ? "warning"
    : item.payment_status === "received"
      ? "success"
      : "neutral";

export const workTone = (item: RequestRow): BadgeTone =>
  item.work_status === "completed"
    ? "success"
    : item.work_status === "failed"
      ? "danger"
      : item.work_status === "suspended" || item.work_status === "unknown"
        ? "warning"
        : item.work_status
          ? "info"
          : "neutral";

export const documentTone = (item: RequestRow): BadgeTone =>
  item.document_state === "available"
    ? "success"
    : item.document_state === "expired"
      ? "warning"
      : "neutral";

const needsAttention = (item: RequestRow) =>
  item.charge_attempt === "unknown" ||
  item.payment_status === "review" ||
  item.work_status === "failed" ||
  item.work_status === "unknown" ||
  item.work_status === "suspended";

export function requestView(item: RequestRow): Exclude<RequestViewId, "all"> {
  if (needsAttention(item)) return "attention";
  if (item.work_status === "completed") return "done";
  if (
    item.work_status === "pending" ||
    item.work_status === "running" ||
    item.work_status === "blocked"
  )
    return "in_analysis";
  return "awaiting_payment";
}

export function requestTone(item: RequestRow): RowTone | undefined {
  if (
    item.work_status === "failed" ||
    item.work_status === "unknown" ||
    item.charge_attempt === "unknown"
  )
    return "danger";
  if (item.payment_status === "review" || item.work_status === "suspended")
    return "warn";
  return undefined;
}

export function viewCounts(rows: RequestRow[]): Record<RequestViewId, number> {
  const counts: Record<RequestViewId, number> = {
    all: rows.length,
    attention: 0,
    awaiting_payment: 0,
    in_analysis: 0,
    done: 0,
  };
  for (const item of rows) counts[requestView(item)] += 1;
  return counts;
}

export function requestKpis(rows: RequestRow[]): Kpi[] {
  const counts = viewCounts(rows);
  const hint = `nos ${rows.length} carregados`;
  return [
    { id: "all", label: "Pedidos", value: counts.all, hint: "carregados" },
    {
      id: "attention",
      label: "Com pendência",
      value: counts.attention,
      hint,
      tone: counts.attention > 0 ? "danger" : undefined,
    },
    {
      id: "awaiting_payment",
      label: "Aguardando pagamento",
      value: counts.awaiting_payment,
      hint,
      tone: counts.awaiting_payment > 0 ? "warning" : undefined,
    },
    { id: "in_analysis", label: "Em análise", value: counts.in_analysis, hint },
    {
      id: "done",
      label: "Concluídos",
      value: counts.done,
      hint,
      tone: counts.done > 0 ? "success" : undefined,
    },
  ];
}

export function requestTimeline(
  item: RequestRow,
  createdAt: string,
): TimelineStep[] {
  const payment: TimelineStep["state"] =
    item.payment_status === "received"
      ? "done"
      : item.charge_attempt === "unknown"
        ? "error"
        : item.payment_status
          ? "current"
          : "todo";
  const work: TimelineStep["state"] =
    item.work_status === "completed"
      ? "done"
      : item.work_status === "failed" || item.work_status === "unknown"
        ? "error"
        : item.work_status
          ? "current"
          : "todo";
  return [
    { title: "Pedido criado", at: createdAt, state: "done" },
    {
      title: "Original",
      detail: documentLabels[item.document_state],
      state: "done",
    },
    {
      title: "Admissão do arquivo",
      detail: admissionLabel(item),
      state: item.admission_outcome
        ? item.admission_outcome === "unsupported"
          ? "error"
          : "done"
        : "todo",
    },
    { title: "Pagamento", detail: paymentLabel(item), state: payment },
    { title: "Análise", detail: workLabel(item), state: work },
  ];
}
