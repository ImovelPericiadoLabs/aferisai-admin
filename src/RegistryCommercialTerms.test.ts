import { describe, expect, it } from "vitest";
import {
  analysisBudgetPerDocumentCents,
  economicAnalysisCallSuggestion,
  parseCommercialNumber,
} from "./RegistryCommercialTerms";

describe("commercial term input", () => {
  it("round-trips displayed Brazilian money and percentage values", () => {
    expect(parseCommercialNumber("15,50")).toBe(1550);
    expect(parseCommercialNumber("1.000,00")).toBe(100000);
    expect(parseCommercialNumber("50,00")).toBe(5000);
    expect(parseCommercialNumber("1.234.567,89")).toBe(123456789);
    expect(parseCommercialNumber("1.000,000")).toBeNull();
  });

  it("calculates the AI reserve per document from planned calls", () => {
    expect(analysisBudgetPerDocumentCents(27, 250)).toBe(6750);
  });

  it("suggests the configured minimum without changing it automatically", () => {
    expect(economicAnalysisCallSuggestion(500, 250)).toBe(250);
    expect(economicAnalysisCallSuggestion(250, 250)).toBeNull();
  });
});
