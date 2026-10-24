export type CommercialValues = {
  onr_markup_bps: number;
  markup_bps: number;
  tax_rate_bps: number;
  payment_fee_cents: number;
  payment_fee_rate_bps: number;
  operations_reserve_cents: number;
  exception_reserve_cents: number;
  minimum_contribution_cents: number;
};

export type CommercialFormInput = {
  values: CommercialValues;
  /** False when a typed number could not be read back to the stored value. */
  inputsMatch: boolean;
  version: string;
  reason: string;
  evidence: string;
  feeChanged: boolean;
};

export type CommercialErrors = Partial<
  Record<
    keyof CommercialValues | "values" | "version" | "reason" | "evidence",
    string
  >
>;

/** Mirrors the backend validation (registry_commercial_routes.py); one place to change. */
export const COMMERCIAL_LIMITS = {
  minMarkupBps: 5000,
  maxMarkupBps: 100000,
  maxRateBps: 5000,
} as const;

const pct = (bps: number) => `${bps / 100}%`;

/** The rules the backend enforces, as one message per field so nothing is guesswork. */
export function commercialErrors(input: CommercialFormInput): CommercialErrors {
  const errors: CommercialErrors = {};
  const { values } = input;
  if (!input.inputsMatch)
    errors.values = "Use números como 1,99 em todos os campos de valores.";
  const { minMarkupBps, maxMarkupBps, maxRateBps } = COMMERCIAL_LIMITS;
  for (const key of ["onr_markup_bps", "markup_bps"] as const) {
    if (values[key] < minMarkupBps)
      errors[key] = `Mínimo de ${pct(minMarkupBps)}.`;
    else if (values[key] > maxMarkupBps)
      errors[key] = `Máximo de ${pct(maxMarkupBps)}.`;
  }
  for (const key of ["tax_rate_bps", "payment_fee_rate_bps"] as const)
    if (values[key] > maxRateBps) errors[key] = `Máximo de ${pct(maxRateBps)}.`;
  if (values.payment_fee_cents <= 0)
    errors.payment_fee_cents = "Informe um valor maior que zero.";
  if (
    !errors.tax_rate_bps &&
    values.payment_fee_rate_bps + values.tax_rate_bps >= 10000
  )
    errors.tax_rate_bps =
      "Tributos e tarifa percentual do PIX precisam somar menos de 100%.";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/.test(input.version))
    errors.version =
      "Use letras, números, ponto, hífen ou sublinhado (até 120 caracteres).";
  if (input.reason.trim().length < 10)
    errors.reason = "Descreva o motivo com pelo menos 10 caracteres.";
  if (input.feeChanged && !/^[0-9a-f]{64}$/.test(input.evidence))
    errors.evidence =
      "A tarifa PIX mudou: informe o SHA-256 da evidência (64 caracteres hexadecimais).";
  return errors;
}
