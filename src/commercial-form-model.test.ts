import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_LIMITS,
  commercialErrors,
  resolveCommercialLimits,
  type CommercialFormInput,
} from "./commercial-form-model";

const valid = (
  over: Partial<CommercialFormInput> = {},
): CommercialFormInput => ({
  values: {
    onr_markup_bps: 5000,
    markup_bps: 5000,
    tax_rate_bps: 1550,
    payment_fee_cents: 199,
    payment_fee_rate_bps: 0,
    operations_reserve_cents: 300,
    exception_reserve_cents: 300,
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
    const errors = commercialErrors(
      valid({
        values: { ...valid().values, onr_markup_bps: 1000, markup_bps: 1000 },
      }),
    );
    expect(errors.onr_markup_bps).toBe("Mínimo de 50%.");
    expect(errors.markup_bps).toBe("Mínimo de 50%.");
  });

  it("needs a PIX fee above zero", () => {
    expect(
      commercialErrors(
        valid({ values: { ...valid().values, payment_fee_cents: 0 } }),
      ).payment_fee_cents,
    ).toMatch(/Mínimo de R\$/);
  });

  it("keeps PIX percentage plus tax under 100%", () => {
    const errors = commercialErrors(
      valid({
        values: {
          ...valid().values,
          tax_rate_bps: 5000,
          payment_fee_rate_bps: 5000,
        },
      }),
    );
    expect(errors.tax_rate_bps).toMatch(/menos de 100%/);
  });

  it("flags a number that could not be read", () => {
    expect(commercialErrors(valid({ inputsMatch: false })).values).toMatch(
      /números/,
    );
  });

  it("checks the version identifier, the reason and the PIX evidence", () => {
    const errors = commercialErrors(
      valid({
        version: "v 3!",
        reason: "curto",
        feeChanged: true,
        evidence: "x",
      }),
    );
    expect(errors.version).toMatch(/letras, números/);
    expect(errors.reason).toMatch(/10 caracteres/);
    expect(errors.evidence).toMatch(/64/);
  });

  it("asks for the PIX evidence only when the fee changes", () => {
    expect(
      commercialErrors(valid({ feeChanged: false, evidence: "" })).evidence,
    ).toBeUndefined();
    expect(
      commercialErrors(valid({ feeChanged: true, evidence: "a".repeat(64) }))
        .evidence,
    ).toBeUndefined();
  });
});

describe("limits", () => {
  it("builds the message from the limit, not from a fixed text", () => {
    expect(COMMERCIAL_LIMITS.onr_markup_bps.min).toBe(5000);
    const errors = commercialErrors(
      valid({ values: { ...valid().values, onr_markup_bps: 100 } }),
    );
    expect(errors.onr_markup_bps).toBe(
      `Mínimo de ${COMMERCIAL_LIMITS.onr_markup_bps.min / 100}%.`,
    );
  });
  it("also enforces the ceilings the backend has", () => {
    const high = commercialErrors(
      valid({
        values: {
          ...valid().values,
          tax_rate_bps: 6000,
          payment_fee_rate_bps: 6000,
          markup_bps: 120000,
        },
      }),
    );
    expect(high.tax_rate_bps).toMatch(/Máximo de 50%/);
    expect(high.payment_fee_rate_bps).toMatch(/Máximo de 50%/);
    expect(high.markup_bps).toMatch(/Máximo de 1000%/);
  });

  it("uses server limits for low and high markups", () => {
    const limits = resolveCommercialLimits({
      ...COMMERCIAL_LIMITS,
      onr_markup_bps: { min: 100, max: 10000 },
      markup_bps: { min: 100, max: 10000 },
    });
    expect(
      commercialErrors(
        valid({ values: { ...valid().values, markup_bps: 100 } }),
        limits,
      ),
    ).toEqual({});
    expect(
      commercialErrors(
        valid({ values: { ...valid().values, markup_bps: 99 } }),
        limits,
      ).markup_bps,
    ).toBe("Mínimo de 1%.");
    expect(
      commercialErrors(
        valid({ values: { ...valid().values, onr_markup_bps: 10001 } }),
        limits,
      ).onr_markup_bps,
    ).toBe("Máximo de 100%.");
    expect(resolveCommercialLimits(undefined)).toBe(COMMERCIAL_LIMITS);
  });
});
