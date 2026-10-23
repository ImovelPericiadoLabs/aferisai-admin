import { describe, expect, it } from "vitest";
import { buildSampleReports } from "./executive-fixture";
import { SAMPLE_LABEL } from "./executive-export";
import { periodFor } from "./executive-model";

const period = periodFor(30, new Date("2026-10-23T15:00:00Z"));

describe("sample reports", () => {
  const data = buildSampleReports(period, true);
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

  it("is labelled as a sample", () => {
    expect(SAMPLE_LABEL).toMatch(/exemplo/i);
  });

  it("is deterministic for the same period", () => {
    expect(buildSampleReports(period, true)).toEqual(data);
  });

  it("has one revenue point per day, contiguous, inside the period", () => {
    expect(data.revenue.series).toHaveLength(30);
    expect(data.revenue.series[0].date).toBe(period.from);
    expect(data.revenue.series.at(-1)!.date).toBe(period.to);
    expect(data.revenue.previous_series).toHaveLength(30);
    expect(data.revenue.previous_series![0].date).toBe(period.previousFrom);
  });

  it("keeps the money consistent: series, slices and net add up", () => {
    const { totals, series } = data.revenue;
    expect(sum(series.map((d) => d.gross_cents))).toBe(totals.gross_cents);
    expect(sum(series.map((d) => d.intents))).toBe(totals.intents_received);
    for (const slices of [
      data.revenue.by_channel,
      data.revenue.by_source,
      data.revenue.by_product,
    ])
      expect(sum(slices.map((s) => s.gross_cents))).toBe(totals.gross_cents);
    expect(totals.net_cents).toBe(
      totals.gross_cents -
        totals.fees_cents -
        totals.tax_cents -
        totals.commission_cents -
        totals.refund_cents,
    );
    expect(totals.avg_ticket_cents).toBe(
      Math.round(totals.gross_cents / totals.intents_received),
    );
    expect(totals.contribution_cents).toBeLessThan(totals.gross_cents);
  });

  it("omits the previous period when comparison is off", () => {
    const off = buildSampleReports(period, false);
    expect(off.revenue.previous).toBeUndefined();
    expect(off.revenue.previous_series).toBeUndefined();
    expect(off.funnel.previous).toBeUndefined();
  });

  it("has a funnel that only narrows and ends near the paid count", () => {
    const counts = data.funnel.steps.map((s) => s.count);
    for (let i = 1; i < counts.length; i += 1)
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    expect(data.funnel.steps.find((s) => s.key === "paid")!.count).toBe(
      data.revenue.totals.intents_received,
    );
  });

  it("ranks partners by revenue, at most ten, without personal data", () => {
    const top = data.revenue.top_organizations;
    expect(top.length).toBeLessThanOrEqual(10);
    expect(top.map((o) => o.gross_cents)).toEqual(
      [...top.map((o) => o.gross_cents)].sort((a, b) => b - a),
    );
    expect(JSON.stringify(data)).not.toMatch(/@|cpf|cnpj/i);
  });

  it("keeps failures inside the totals and percentiles ordered", () => {
    for (const group of data.fulfillment.groups) {
      expect(group.completed + group.failed + group.unknown).toBeGreaterThan(0);
      if (group.p50_seconds !== null && group.p95_seconds !== null)
        expect(group.p95_seconds).toBeGreaterThanOrEqual(group.p50_seconds);
    }
    for (const group of data.ai.groups)
      expect(group.failed).toBeLessThanOrEqual(group.calls);
    expect(data.webhooks.delivered + data.webhooks.failed).toBeLessThanOrEqual(
      data.webhooks.attempts,
    );
    expect(data.exceptions.overdue).toBeLessThanOrEqual(data.exceptions.open);
  });
});
