import { describe, expect, it } from "vitest";
import { explainPart, type ExplainContext } from "./price-explain";

const plain = (text: string) => text.replace(/ /g, " ");

const ctx = (over: Partial<ExplainContext> = {}): ExplainContext => ({
  priceCents: 31277,
  parts: {
    cost: 7751, markup: 3876, api: 88, analysis: 6750, operations: 300,
    exception: 1000, payment: 199, tax: 4848, contribution: 6548,
  },
  terms: {
    onrMarkupBps: 5000, markupBps: 5000, taxRateBps: 1550, paymentFeeCents: 199,
    paymentFeeRateBps: 0, analysisReserveCents: 6750, operationsReserveCents: 300,
    exceptionReserveCents: 1000, minimumContributionCents: 2000,
  },
  ...over,
});

describe("explainPart", () => {
  it("gives every part a title, a plain explanation and an example", () => {
    for (const key of ["cost", "markup", "api", "analysis", "operations", "exception", "payment", "tax", "contribution", "markup_general", "minimum_contribution"] as const) {
      const text = explainPart(key, ctx());
      expect(text.title.length).toBeGreaterThan(3);
      expect(text.body.length).toBeGreaterThan(20);
      expect(text.example.length).toBeGreaterThan(10);
    }
  });

  it("builds the example from the real numbers on screen", () => {
    const markup = plain(explainPart("markup", ctx()).example);
    expect(markup).toContain("R$ 77,51");
    expect(markup).toContain("50%");
    expect(markup).toContain("R$ 38,76");
    const tax = plain(explainPart("tax", ctx()).example);
    expect(tax).toContain("15,5%");
    expect(tax).toContain("R$ 48,48");
  });

  it("scales the per-order reserves to a hundred orders", () => {
    expect(plain(explainPart("operations", ctx()).example)).toContain("R$ 300,00");
    expect(plain(explainPart("exception", ctx()).example)).toContain("R$ 1.000,00");
  });

  it("falls back to a round-number illustration when there is no price on screen", () => {
    const text = plain(explainPart("tax", ctx({ priceCents: null, parts: null })).example);
    expect(text).toContain("R$ 100,00");
    expect(text).toContain("R$ 15,50");
  });

  it("does not claim a number it does not have", () => {
    const text = plain(explainPart("cost", ctx({ parts: null, priceCents: null })).example);
    expect(text).not.toMatch(/R\$ 77/);
  });
});
