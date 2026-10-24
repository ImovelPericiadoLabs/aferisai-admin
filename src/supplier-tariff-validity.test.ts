import { describe, expect, it } from "vitest";
import {
  supplierTariffIsCurrent,
  supplierTariffValidityLabel,
} from "./supplier-tariff-validity";

describe("validade das tarifas do fornecedor", () => {
  it("mantém a tarifa gerida pelo administrador sem prazo artificial", () => {
    const until = "9999-12-31T00:00:00Z";
    expect(supplierTariffIsCurrent(until)).toBe(true);
    expect(supplierTariffValidityLabel(until)).toBe(
      "Vigente até atualização do gestor",
    );
  });

  it("identifica versões históricas que já venceram", () => {
    const until = "2026-10-23T00:00:00Z";
    expect(supplierTariffIsCurrent(until, Date.UTC(2026, 9, 24))).toBe(false);
    expect(supplierTariffValidityLabel(until)).toContain("Vencida em");
  });
});
