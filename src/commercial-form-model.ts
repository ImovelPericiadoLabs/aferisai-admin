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

export type CommercialLimits = Record<
  keyof CommercialValues,
  { min: number; max: number }
> & {
  rate_sum_max_bps: number;
};

/** Used only while talking to a backend release that does not return limits. */
export const COMMERCIAL_LIMITS: CommercialLimits = {
  onr_markup_bps: { min: 5000, max: 100000 },
  markup_bps: { min: 5000, max: 100000 },
  tax_rate_bps: { min: 0, max: 5000 },
  payment_fee_cents: { min: 1, max: 1000000 },
  payment_fee_rate_bps: { min: 0, max: 5000 },
  operations_reserve_cents: { min: 0, max: 10000000 },
  exception_reserve_cents: { min: 0, max: 10000000 },
  minimum_contribution_cents: { min: 0, max: 10000000 },
  rate_sum_max_bps: 9999,
};

export function resolveCommercialLimits(
  value: CommercialLimits | undefined,
): CommercialLimits {
  if (!value) return COMMERCIAL_LIMITS;
  const keys = Object.keys(COMMERCIAL_LIMITS).filter(
    (key) => key !== "rate_sum_max_bps",
  ) as (keyof CommercialValues)[];
  if (
    !keys.every(
      (key) =>
        Number.isSafeInteger(value[key]?.min) &&
        Number.isSafeInteger(value[key]?.max) &&
        value[key].min <= value[key].max,
    ) ||
    !Number.isSafeInteger(value.rate_sum_max_bps)
  )
    return COMMERCIAL_LIMITS;
  return value;
}

const pct = (bps: number) => `${bps / 100}%`;

/** The rules the backend enforces, as one message per field so nothing is guesswork. */
export function commercialErrors(
  input: CommercialFormInput,
  limits: CommercialLimits = COMMERCIAL_LIMITS,
): CommercialErrors {
  const errors: CommercialErrors = {};
  const { values } = input;
  if (!input.inputsMatch)
    errors.values = "Use números como 1,99 em todos os campos de valores.";
  for (const key of Object.keys(COMMERCIAL_LIMITS).filter(
    (item) => item !== "rate_sum_max_bps",
  ) as (keyof CommercialValues)[]) {
    const bound = limits[key];
    const show = key.endsWith("_bps")
      ? pct
      : (amount: number) =>
          new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(amount / 100);
    if (values[key] < bound.min) errors[key] = `Mínimo de ${show(bound.min)}.`;
    else if (values[key] > bound.max)
      errors[key] = `Máximo de ${show(bound.max)}.`;
  }
  if (
    !errors.tax_rate_bps &&
    values.payment_fee_rate_bps + values.tax_rate_bps > limits.rate_sum_max_bps
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
