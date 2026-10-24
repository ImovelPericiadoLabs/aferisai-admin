import { describe, expect, it } from "vitest";
import { commercialErrors, type CommercialFormInput } from "./commercial-form-model";

const valid = (over: Partial<CommercialFormInput> = {}): CommercialFormInput => ({
  values: {
    onr_markup_bps: 5000, markup_bps: 5000, tax_rate_bps: 1550, payment_fee_cents: 199,
    payment_fee_rate_bps: 0, operations_reserve_cents: 300, exception_reserve_cents: 300,
    minimum_contribution_cents: 1000,
  },
  inputsMatch: true,
  version: "direct-onr-2026-10-v3",
  reason: "Ajuste aprovado pela diretoria.",
  evidence: "",
  feeChanged: false,
  ...over,
});

describe("commercialErrors", () => {
  it("is empty for a valid draft", () => {
    expect(commercialErrors(valid())).toEqual({});
  });

  it("explains a markup under 50% on the field that has it", () => {
    const errors = commercialErrors(valid({ values: { ...valid().values, onr_markup_bps: 1000, markup_bps: 1000 } }));
    expect(errors.onr_markup_bps).toBe("Mínimo de 50%.");
    expect(errors.markup_bps).toBe("Mínimo de 50%.");
  });

  it("needs a PIX fee above zero", () => {
    expect(commercialErrors(valid({ values: { ...valid().values, payment_fee_cents: 0 } })).payment_fee_cents).toMatch(/maior que zero/);
  });

  it("keeps PIX percentage plus tax under 100%", () => {
    const errors = commercialErrors(valid({ values: { ...valid().values, tax_rate_bps: 9000, payment_fee_rate_bps: 1000 } }));
    expect(errors.tax_rate_bps).toMatch(/menos de 100%/);
  });

  it("flags a number that could not be read", () => {
    expect(commercialErrors(valid({ inputsMatch: false })).values).toMatch(/números/);
  });

  it("checks the version identifier, the reason and the PIX evidence", () => {
    const errors = commercialErrors(valid({ version: "v 3!", reason: "curto", feeChanged: true, evidence: "x" }));
    expect(errors.version).toMatch(/letras, números/);
    expect(errors.reason).toMatch(/10 caracteres/);
    expect(errors.evidence).toMatch(/64/);
  });

  it("asks for the PIX evidence only when the fee changes", () => {
    expect(commercialErrors(valid({ feeChanged: false, evidence: "" })).evidence).toBeUndefined();
    expect(commercialErrors(valid({ feeChanged: true, evidence: "a".repeat(64) })).evidence).toBeUndefined();
  });
});
