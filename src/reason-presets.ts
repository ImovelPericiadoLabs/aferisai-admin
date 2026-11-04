/**
 * Ready-made reasons for decisions that must be justified. The person picks one and may add a detail;
 * the text sent to the API is `option: detail`, so the audit trail keeps plain readable sentences and
 * the backend contract (a 10-500 character reason) does not change.
 */
export type ReasonPreset = {
  id: string;
  label: string;
  /** Small hint shown under the option. */
  hint?: string;
  /** The free option: nothing is sent unless the person describes the reason. */
  requiresNote?: boolean;
};

export type ReasonContext =
  | "propose-correct"
  | "propose-refund"
  | "confirm-correct"
  | "confirm-refund"
  | "reassign"
  | "read-original";

const other: ReasonPreset = {
  id: "other",
  label: "Outro motivo",
  hint: "Descreva com suas palavras.",
  requiresNote: true,
};

export const REASON_PRESETS: Record<ReasonContext, ReasonPreset[]> = {
  "propose-correct": [
    {
      id: "recoverable",
      label: "Os documentos pendentes ainda podem ser recuperados",
    },
    { id: "temporary", label: "A falha foi temporária do fornecedor" },
    {
      id: "partial",
      label: "Parte dos documentos já foi entregue e o restante é recuperável",
    },
    other,
  ],
  "propose-refund": [
    {
      id: "not-recoverable",
      label: "Os documentos pendentes não podem ser recuperados",
    },
    {
      id: "not-found",
      label: "O fornecedor não localizou o documento solicitado",
    },
    { id: "deadline", label: "O prazo para entregar o documento se esgotou" },
    { id: "customer-request", label: "O cliente pediu o reembolso" },
    other,
  ],
  "confirm-correct": [
    { id: "agree", label: "De acordo com a proposta do gestor" },
    { id: "payment-checked", label: "Valor e forma de pagamento conferidos" },
    {
      id: "still-possible",
      label: "Conferi o pedido e a entrega ainda é possível",
    },
    other,
  ],
  "confirm-refund": [
    { id: "agree", label: "De acordo com a proposta do gestor" },
    { id: "payment-checked", label: "Valor e forma de pagamento conferidos" },
    {
      id: "not-deliverable",
      label: "Conferi o pedido e a entrega não é possível",
    },
    other,
  ],
  reassign: [
    { id: "absent", label: "A pessoa responsável está ausente" },
    { id: "workload", label: "Redistribuição da carga de trabalho da equipe" },
    { id: "ownership", label: "Mudança de responsabilidade pelo caso" },
    other,
  ],
  "read-original": [
    { id: "check-delivery", label: "Conferir o documento entregue ao cliente" },
    { id: "investigate", label: "Investigar a falha na entrega" },
    { id: "customer-support", label: "Atender uma dúvida do cliente" },
    other,
  ],
};

/** The text to send: the option, plus the detail when there is one; the free option sends the detail alone. */
export function composeReason(
  presets: readonly ReasonPreset[],
  presetId: string,
  note: string,
): string {
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) return "";
  const detail = note.trim();
  if (preset.requiresNote) return detail;
  return detail ? `${preset.label}: ${detail}` : preset.label;
}

/** What is still missing, in words; empty when the reason can be sent. */
export function reasonProblem(
  presets: readonly ReasonPreset[],
  presetId: string,
  note: string,
  min: number,
  max: number,
): string {
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) return "Escolha o motivo.";
  const detail = note.trim().length;
  if (preset.requiresNote && detail < min)
    return `Descreva o motivo (${detail}/${min} caracteres).`;
  const text = composeReason(presets, presetId, note);
  if (text.length < min)
    return `Escreva pelo menos ${min} caracteres (${text.length}/${min}).`;
  if (text.length > max)
    return `Use no máximo ${max} caracteres (${text.length}/${max}).`;
  return "";
}
