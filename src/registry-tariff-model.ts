export type LimitRange = { min: number; max: number };
export type TariffLimits = {
  order_fee_cents: LimitRange;
  download_fee_cents: LimitRange;
  monthly_minimum_reserve_cents: LimitRange;
  reason_length: LimitRange;
};

/** Used only while talking to a backend release that does not return limits. */
export const DEFAULT_TARIFF_LIMITS: TariffLimits = {
  order_fee_cents: { min: 1, max: 100_000 },
  download_fee_cents: { min: 1, max: 100_000 },
  monthly_minimum_reserve_cents: { min: 0, max: 100_000 },
  reason_length: { min: 10, max: 500 },
};

/** The backend's ranges win, field by field; anything it does not send keeps the default. */
export function resolveTariffLimits(
  raw: Partial<TariffLimits> | null | undefined,
): TariffLimits {
  return { ...DEFAULT_TARIFF_LIMITS, ...(raw ?? {}) };
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const rangeText = (range: LimitRange) =>
  `de ${brl.format(range.min / 100)} a ${brl.format(range.max / 100)}`.replaceAll(
    "\u00a0",
    " ",
  );

export type TariffDraft = {
  infosimplesAccountId: string;
  onrAccountId: string;
  orderFee: string;
  downloadFee: string;
  monthlyReserve: string;
  evidenceSha256: string;
  reason: string;
  contractVerified: boolean;
  supplierFeeCovered: boolean;
};

export const emptyTariffDraft: TariffDraft = {
  infosimplesAccountId: "",
  onrAccountId: "",
  orderFee: "",
  downloadFee: "",
  monthlyReserve: "0,00",
  evidenceSha256: "",
  reason: "",
  contractVerified: false,
  supplierFeeCovered: false,
};

const within = (value: number | null, range: LimitRange): value is number =>
  value !== null && value >= range.min && value <= range.max;

export function parseBrlCents(value: string): number | null {
  if (!/^\d+(?:,\d{1,2})?$/.test(value.trim())) return null;
  const [reais, cents = ""] = value.trim().split(",");
  const amount = Number(reais) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function tariffDraftBody(
  draft: TariffDraft,
  limits: TariffLimits = DEFAULT_TARIFF_LIMITS,
) {
  const order = parseBrlCents(draft.orderFee);
  const download = parseBrlCents(draft.downloadFee);
  const reserve = parseBrlCents(draft.monthlyReserve);
  if (
    !draft.infosimplesAccountId ||
    !draft.onrAccountId ||
    !within(order, limits.order_fee_cents) ||
    !within(download, limits.download_fee_cents) ||
    !within(reserve, limits.monthly_minimum_reserve_cents) ||
    !/^[0-9a-f]{64}$/.test(draft.evidenceSha256.trim()) ||
    draft.reason.trim().length < limits.reason_length.min ||
    draft.reason.trim().length > limits.reason_length.max ||
    !draft.contractVerified ||
    !draft.supplierFeeCovered
  )
    return null;
  return {
    infosimples_account_id: draft.infosimplesAccountId,
    onr_account_id: draft.onrAccountId,
    order_fee_cents: order,
    download_fee_cents: download,
    monthly_minimum_reserve_cents: reserve,
    evidence_sha256: draft.evidenceSha256.trim(),
    reason: draft.reason.trim(),
    contract_verified: true as const,
    supplier_fee_covered: true as const,
  };
}

/** Values, evidence, confirmation: which of the three blocks of the form is finished. */
export function tariffComplete(
  draft: TariffDraft,
  limits: TariffLimits = DEFAULT_TARIFF_LIMITS,
): [boolean, boolean, boolean] {
  const values =
    !!draft.infosimplesAccountId &&
    !!draft.onrAccountId &&
    within(parseBrlCents(draft.orderFee), limits.order_fee_cents) &&
    within(parseBrlCents(draft.downloadFee), limits.download_fee_cents) &&
    within(
      parseBrlCents(draft.monthlyReserve),
      limits.monthly_minimum_reserve_cents,
    );
  const reason = draft.reason.trim().length;
  const evidence =
    /^[0-9a-f]{64}$/.test(draft.evidenceSha256.trim()) &&
    reason >= limits.reason_length.min &&
    reason <= limits.reason_length.max;
  return [values, evidence, draft.contractVerified && draft.supplierFeeCovered];
}

/** What still blocks publishing, in words the person can act on. */
export function tariffProblems(
  draft: TariffDraft,
  limits: TariffLimits = DEFAULT_TARIFF_LIMITS,
): string[] {
  const problems: string[] = [];
  if (!draft.onrAccountId) problems.push("a conta RI Digital");
  if (!draft.infosimplesAccountId) problems.push("a conta InfoSimples");
  if (!within(parseBrlCents(draft.orderFee), limits.order_fee_cents))
    problems.push(`o valor do pedido (${rangeText(limits.order_fee_cents)})`);
  if (!within(parseBrlCents(draft.downloadFee), limits.download_fee_cents))
    problems.push(
      `o valor de cada download (${rangeText(limits.download_fee_cents)})`,
    );
  if (
    !within(
      parseBrlCents(draft.monthlyReserve),
      limits.monthly_minimum_reserve_cents,
    )
  )
    problems.push(
      `o mínimo mensal (${rangeText(limits.monthly_minimum_reserve_cents)})`,
    );
  if (!/^[0-9a-f]{64}$/.test(draft.evidenceSha256.trim()))
    problems.push("o SHA-256 da evidência (64 caracteres hexadecimais)");
  const reason = draft.reason.trim().length;
  if (reason < limits.reason_length.min || reason > limits.reason_length.max)
    problems.push(
      `o motivo (de ${limits.reason_length.min} a ${limits.reason_length.max} caracteres)`,
    );
  if (!draft.contractVerified || !draft.supplierFeeCovered)
    problems.push("as duas declarações");
  return problems;
}
