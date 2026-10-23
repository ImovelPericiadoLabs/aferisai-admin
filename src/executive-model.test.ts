import { describe, expect, it } from "vitest";
import type { FunnelReport, RevenueTotals } from "./executive-contract";
import {
  PRESETS,
  conversionSteps,
  deltaBps,
  formatBRL,
  formatCompactBRL,
  formatDuration,
  formatPercentBps,
  keyLabel,
  kpiCards,
  successBps,
  marginBps,
  periodFor,
  rateBps,
  saoPauloDate,
} from "./executive-model";

const totals = (o: Partial<RevenueTotals> = {}): RevenueTotals => ({
  gross_cents: 1_000_00,
  fees_cents: 30_00,
  tax_cents: 60_00,
  commission_cents: 100_00,
  refund_cents: 20_00,
  net_cents: 790_00,
  contribution_cents: 400_00,
  intents_received: 50,
  avg_ticket_cents: 20_00,
  ...o,
});

describe("São Paulo calendar", () => {
  it("uses the Brasília day, not the UTC day", () => {
    // 01:30 UTC on the 24th is still the evening of the 23rd in Brasília (UTC-3).
    expect(saoPauloDate(new Date("2026-10-24T01:30:00Z"))).toBe("2026-10-23");
    expect(saoPauloDate(new Date("2026-10-24T03:00:00Z"))).toBe("2026-10-24");
  });
  it("builds inclusive windows ending today, with the previous period right before", () => {
    const now = new Date("2026-10-23T15:00:00Z");
    expect(periodFor(7, now)).toEqual({
      from: "2026-10-17",
      to: "2026-10-23",
      days: 7,
      previousFrom: "2026-10-10",
      previousTo: "2026-10-16",
    });
    expect(periodFor(30, now).from).toBe("2026-09-24");
    expect(periodFor(90, now).previousTo).toBe("2026-07-25");
  });
  it("offers 7, 30 and 90 days, the range the backend accepts", () => {
    expect(PRESETS).toEqual([7, 30, 90]);
  });
});

describe("formatting", () => {
  it("formats reais from cents in pt-BR", () => {
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(formatBRL(0)).toBe("R$ 0,00");
    expect(formatBRL(-5000)).toBe("-R$ 50,00");
  });
  it("shortens large amounts without hiding the unit", () => {
    expect(formatCompactBRL(95_00)).toBe("R$ 95");
    expect(formatCompactBRL(12_345_00)).toBe("R$ 12,3 mil");
    expect(formatCompactBRL(2_450_000_00)).toBe("R$ 2,5 mi");
  });
  it("formats rates and durations", () => {
    expect(formatPercentBps(1234)).toBe("12,3%");
    expect(formatPercentBps(10000)).toBe("100%");
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(150)).toBe("2 min 30 s");
    expect(formatDuration(3 * 3600 + 20 * 60)).toBe("3 h 20 min");
    expect(formatDuration(null)).toBe("—");
  });
});

describe("rates", () => {
  it("computes rates in basis points and never divides by zero", () => {
    expect(rateBps(1, 3)).toBe(3333);
    expect(rateBps(0, 0)).toBeNull();
    expect(marginBps(totals())).toBe(4000);
    expect(marginBps(totals({ gross_cents: 0 }))).toBeNull();
  });
  it("compares with the previous period and flags a missing baseline", () => {
    expect(deltaBps(120, 100)).toBe(2000);
    expect(deltaBps(80, 100)).toBe(-2000);
    expect(deltaBps(5, 0)).toBeNull();
    expect(deltaBps(5, undefined)).toBeNull();
  });
});

describe("conversionSteps", () => {
  const funnel: FunnelReport = {
    steps: [
      { key: "requests", count: 1000 },
      { key: "quoted", count: 800 },
      { key: "pix_created", count: 400 },
      { key: "paid", count: 320 },
      { key: "delivered", count: 300 },
    ],
  };
  it("gives each step its share of the top and of the step before", () => {
    const steps = conversionSteps(funnel);
    expect(steps.map((s) => s.label)).toEqual([
      "Pedidos",
      "Cotados",
      "PIX gerado",
      "Pagos",
      "Entregues",
    ]);
    expect(steps[1]).toMatchObject({
      count: 800,
      ofTopBps: 8000,
      ofPreviousBps: 8000,
    });
    expect(steps[2]).toMatchObject({ ofTopBps: 4000, ofPreviousBps: 5000 });
    expect(steps[4]).toMatchObject({ ofTopBps: 3000, ofPreviousBps: 9375 });
    expect(steps[0]).toMatchObject({ ofTopBps: 10000, ofPreviousBps: null });
  });
  it("does not break on an empty funnel", () => {
    expect(
      conversionSteps({ steps: [{ key: "requests", count: 0 }] })[0].ofTopBps,
    ).toBeNull();
  });
});

describe("kpiCards", () => {
  it("lists the headline numbers with their change against the previous period", () => {
    const cards = kpiCards({
      revenue: totals(),
      previous: totals({
        gross_cents: 800_00,
        contribution_cents: 400_00,
        intents_received: 40,
      }),
      paidRatioBps: 3200,
      medianSeconds: 5400,
      owedCents: 250_00,
    });
    expect(cards.map((c) => c.id)).toEqual([
      "gross",
      "net",
      "margin",
      "ticket",
      "paid",
      "conversion",
      "delivery",
      "owed",
    ]);
    const gross = cards.find((c) => c.id === "gross")!;
    expect(gross.value).toBe("R$ 1.000,00");
    expect(gross.deltaBps).toBe(2500);
    const paid = cards.find((c) => c.id === "paid")!;
    expect(paid.value).toBe("50");
    expect(paid.deltaBps).toBe(2500);
    expect(cards.find((c) => c.id === "margin")!.value).toBe("40%");
    expect(cards.find((c) => c.id === "delivery")!.value).toBe("1 h 30 min");
    expect(cards.find((c) => c.id === "owed")!.value).toBe("R$ 250,00");
  });
  it("shows no change when there is no previous period", () => {
    const cards = kpiCards({
      revenue: totals(),
      previous: undefined,
      paidRatioBps: null,
      medianSeconds: null,
      owedCents: 0,
    });
    expect(cards.every((c) => c.deltaBps === null)).toBe(true);
    expect(cards.find((c) => c.id === "conversion")!.value).toBe("—");
  });
});

describe("labels and success rate", () => {
  it("names the keys the backend uses and keeps unknown ones as they are", () => {
    expect(keyLabel("integration")).toBe("Integração de parceiro");
    expect(keyLabel("onr")).toBe("RI Digital (ONR)");
    expect(keyLabel("novo_produto")).toBe("novo_produto");
  });
  it("counts uncertain results against the success rate", () => {
    expect(successBps({ completed: 90, failed: 6, unknown: 4 })).toBe(9000);
    expect(successBps({ completed: 0, failed: 0, unknown: 0 })).toBeNull();
  });
});
