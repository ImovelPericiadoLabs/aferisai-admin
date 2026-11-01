import type {
  RegistryCommercialTerms as Terms,
  RegistryCommercialTermsCreate,
} from "./api";
import type {
  CommercialErrors,
  CommercialLimits,
} from "./commercial-form-model";

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export type NumericKey = keyof Pick<
  RegistryCommercialTermsCreate,
  | "operations_reserve_cents"
  | "analysis_call_reserve_cents"
  | "exception_reserve_cents"
  | "payment_fee_cents"
  | "payment_fee_rate_bps"
  | "tax_rate_bps"
  | "minimum_contribution_cents"
  | "markup_bps"
  | "onr_markup_bps"
>;
export const numericKeys: NumericKey[] = [
  "analysis_call_reserve_cents",
  "operations_reserve_cents",
  "exception_reserve_cents",
  "payment_fee_cents",
  "payment_fee_rate_bps",
  "tax_rate_bps",
  "minimum_contribution_cents",
  "markup_bps",
  "onr_markup_bps",
];
export function displayNumber(value: number): string {
  return (value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
export function parseCommercialNumber(value: string): number | null {
  const trimmed = value.trim();
  const normalized = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(trimmed)
    ? trimmed.replaceAll(".", "").replace(",", ".")
    : trimmed.replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const scaled = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(scaled) ? scaled : null;
}

/** Calculates the per-document AI reserve from the planned calls and reserve per call. */
export function analysisBudgetPerDocumentCents(
  plannedCalls: number,
  callReserveCents: number,
): number {
  return Number.isSafeInteger(plannedCalls) &&
    Number.isSafeInteger(callReserveCents)
    ? Math.max(1000, plannedCalls * callReserveCents)
    : 0;
}

/** Returns the lowest server-allowed reserve when it is cheaper than the current one. */
export function economicAnalysisCallSuggestion(
  currentCents: number,
  minimumCents: number,
): number | null {
  if (
    !Number.isSafeInteger(currentCents) ||
    !Number.isSafeInteger(minimumCents)
  )
    return null;
  return currentCents > minimumCents ? minimumCents : null;
}

export const commercialFields: {
  key: NumericKey;
  label: string;
  unit: string;
}[] = [
  {
    key: "analysis_call_reserve_cents",
    label: "Reserva de IA por chamada",
    unit: "R$ por chamada planejada",
  },
  {
    key: "onr_markup_bps",
    label: "Acréscimo sobre a matrícula ONR",
    unit: "%",
  },
  {
    key: "markup_bps",
    label: "Acréscimo público sobre o custo total",
    unit: "%",
  },
  {
    key: "tax_rate_bps",
    label: "Reserva tributária",
    unit: "%",
  },
  { key: "payment_fee_cents", label: "Tarifa fixa PIX", unit: "R$" },
  {
    key: "payment_fee_rate_bps",
    label: "Tarifa percentual PIX",
    unit: "%",
  },
  {
    key: "operations_reserve_cents",
    label: "Reserva operacional",
    unit: "R$ por pedido",
  },
  {
    key: "exception_reserve_cents",
    label: "Reserva de exceção",
    unit: "R$ por pedido",
  },
  {
    key: "minimum_contribution_cents",
    label: "Contribuição mínima",
    unit: "R$",
  },
];

/** Show the current value and server-published field bounds. */
export function unitHint(
  key: NumericKey,
  unit: string,
  current: Terms,
  limits: CommercialLimits,
): string {
  const value = current[key];
  const shown = unit.startsWith("%")
    ? `${(value / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
    : `R$ ${displayNumber(value)}`;
  const floor = limits[key].min;
  const ceiling = limits[key].max;
  const show = (amount: number) =>
    unit.startsWith("%")
      ? `${(amount / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
      : money(amount);
  const bound = ` · mínimo ${show(floor)} · máximo ${show(ceiling)}`;
  return `${unit}${bound} · atual ${shown}`;
}

export function draftFrom(terms: Terms): RegistryCommercialTermsCreate {
  return {
    base_offer_id: terms.id,
    version: "",
    analysis_call_reserve_cents: terms.analysis_call_reserve_cents,
    operations_reserve_cents: terms.operations_reserve_cents,
    exception_reserve_cents: terms.exception_reserve_cents,
    payment_fee_cents: terms.payment_fee_cents,
    payment_fee_rate_bps: terms.payment_fee_rate_bps,
    tax_rate_bps: terms.tax_rate_bps,
    minimum_contribution_cents: terms.minimum_contribution_cents,
    markup_bps: terms.markup_bps,
    onr_markup_bps: terms.onr_markup_bps,
    payment_fee_evidence_sha256: null,
    reason: "",
  };
}

/** Reads a field error once the person typed in it or tried to review. */
export type ShownError = (
  key: keyof CommercialErrors,
  typed: boolean,
) => string | undefined;

/** Writes one field of the draft and drops the review step. */
export type SetDraftField = <K extends keyof RegistryCommercialTermsCreate>(
  key: K,
  value: RegistryCommercialTermsCreate[K],
) => void;
