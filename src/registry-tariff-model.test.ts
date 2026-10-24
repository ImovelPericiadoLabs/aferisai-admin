import { describe, expect, it } from "vitest";
import {
  parseBrlCents,
  tariffProblems,
  tariffComplete,
  tariffDraftBody,
  type TariffDraft,
} from "./registry-tariff-model";

const draft = (changes: Partial<TariffDraft> = {}): TariffDraft => ({
  infosimplesAccountId: "info-account",
  onrAccountId: "onr-account",
  orderFee: "0,28",
  downloadFee: "0,20",
  monthlyReserve: "0,00",
  evidenceSha256: "a".repeat(64),
  reason: "Tarifa conferida no extrato autenticado.",
  contractVerified: true,
  supplierFeeCovered: true,
  ...changes,
});

describe("registry visualization tariff", () => {
  it("converts BRL exactly into cents, including zero reserve", () => {
    expect(parseBrlCents("0,28")).toBe(28);
    expect(parseBrlCents("0,2")).toBe(20);
    expect(parseBrlCents("0,00")).toBe(0);
    expect(parseBrlCents("0.28")).toBeNull();
    expect(parseBrlCents("1,234")).toBeNull();
  });

  it("builds the audited body only after both confirmations", () => {
    expect(tariffDraftBody(draft())).toMatchObject({
      order_fee_cents: 28,
      download_fee_cents: 20,
      monthly_minimum_reserve_cents: 0,
      contract_verified: true,
      supplier_fee_covered: true,
    });
    expect(tariffDraftBody(draft({ contractVerified: false }))).toBeNull();
    expect(tariffDraftBody(draft({ supplierFeeCovered: false }))).toBeNull();
    expect(
      tariffDraftBody(draft({ evidenceSha256: "a".repeat(63) })),
    ).toBeNull();
    expect(tariffDraftBody(draft({ orderFee: "0" }))).toBeNull();
  });
});

describe("tariffComplete", () => {
  it("is complete for each step independently", () => {
    expect(tariffComplete(draft())).toEqual([true, true, true]);
    expect(tariffComplete(draft({ orderFee: "" }))).toEqual([
      false,
      true,
      true,
    ]);
    expect(tariffComplete(draft({ evidenceSha256: "x" }))).toEqual([
      true,
      false,
      true,
    ]);
    expect(tariffComplete(draft({ reason: "curto" }))).toEqual([
      true,
      false,
      true,
    ]);
    expect(tariffComplete(draft({ contractVerified: false }))).toEqual([
      true,
      true,
      false,
    ]);
  });
  it("needs both accounts in the values step", () => {
    expect(tariffComplete(draft({ onrAccountId: "" }))[0]).toBe(false);
    expect(tariffComplete(draft({ infosimplesAccountId: "" }))[0]).toBe(false);
  });
});

describe("tariffProblems", () => {
  it("is empty for a valid draft", () => {
    expect(tariffProblems(draft())).toEqual([]);
  });
  it("names each thing that is missing or wrong", () => {
    const problems = tariffProblems(
      draft({
        onrAccountId: "",
        orderFee: "",
        evidenceSha256: "x",
        reason: "curto",
        contractVerified: false,
      }),
    );
    expect(problems).toEqual([
      "a conta RI Digital",
      "o valor do pedido",
      "o SHA-256 da evidência (64 caracteres hexadecimais)",
      "o motivo (mínimo 10 caracteres)",
      "as duas declarações",
    ]);
  });
});
