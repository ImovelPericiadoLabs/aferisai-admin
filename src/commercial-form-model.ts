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
    | keyof CommercialValues
    | "values"
    | "version"
    | "reason"
    | "evidence",
    string
  >
>;

const MIN_MARKUP_BPS = 5000;

/** The rules the backend enforces, as one message per field so nothing is guesswork. */
export function commercialErrors(input: CommercialFormInput): CommercialErrors {
  const errors: CommercialErrors = {};
  const { values } = input;
  if (!input.inputsMatch)
    errors.values = "Use números como 1,99 em todos os campos de valores.";
  if (values.onr_markup_bps < MIN_MARKUP_BPS) errors.onr_markup_bps = "Mínimo de 50%.";
  if (values.markup_bps < MIN_MARKUP_BPS) errors.markup_bps = "Mínimo de 50%.";
  if (values.payment_fee_cents <= 0)
    errors.payment_fee_cents = "Informe um valor maior que zero.";
  if (values.payment_fee_rate_bps + values.tax_rate_bps >= 10000)
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
