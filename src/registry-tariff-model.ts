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

export function parseBrlCents(value: string): number | null {
  if (!/^\d+(?:,\d{1,2})?$/.test(value.trim())) return null;
  const [reais, cents = ""] = value.trim().split(",");
  const amount = Number(reais) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function tariffDraftBody(draft: TariffDraft) {
  const order = parseBrlCents(draft.orderFee);
  const download = parseBrlCents(draft.downloadFee);
  const reserve = parseBrlCents(draft.monthlyReserve);
  if (
    !draft.infosimplesAccountId ||
    !draft.onrAccountId ||
    order === null ||
    order < 1 ||
    order > 100_000 ||
    download === null ||
    download < 1 ||
    download > 100_000 ||
    reserve === null ||
    reserve > 100_000 ||
    !/^[0-9a-f]{64}$/.test(draft.evidenceSha256.trim()) ||
    draft.reason.trim().length < 10 ||
    draft.reason.trim().length > 500 ||
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
