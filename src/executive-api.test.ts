import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadExecutiveReports,
  toExecutiveReports,
  type RawReports,
} from "./executive-api";

const period = {
  from: "2026-10-01",
  to: "2026-10-07",
  days: 7,
  previousFrom: "2026-09-24",
  previousTo: "2026-09-30",
};

const totals = {
  gross_cents: 1000,
  fees_cents: 10,
  tax_cents: 20,
  commission_cents: 30,
  refund_cents: 0,
  net_cents: 940,
  contribution_cents: 400,
  intents_received: 2,
  avg_ticket_cents: 500,
};

const raw: RawReports = {
  revenue: {
    timezone: "America/Sao_Paulo",
    from: "2026-10-01",
    to: "2026-10-07",
    compare: true,
    totals,
    previous: null,
    series: [],
    previous_series: null,
    by_channel: [],
    by_source: [],
    by_product: [],
    top_organizations: [],
  },
  funnel: {
    timezone: "America/Sao_Paulo",
    from: "2026-10-01",
    to: "2026-10-07",
    compare: true,
    totals: { requests: 10, quoted: 8, pix_created: 5, paid: 4, delivered: 3 },
    previous: { requests: 6, quoted: 5, pix_created: 3, paid: 2, delivered: 1 },
    by_source: null,
  },
  fulfillment: {
    timezone: "x",
    from: "x",
    to: "x",
    compare: true,
    groups: [
      {
        key: "analysis",
        completed: 3,
        failed: 1,
        unknown: 0,
        p50_seconds: 120,
        p95_seconds: null,
      },
    ],
    previous: null,
  },
  commissions: {
    timezone: "x",
    from: "x",
    to: "x",
    compare: true,
    totals: {
      provisional_cents: 1,
      owed_cents: 2,
      settled_cents: 3,
      reversed_cents: 4,
    },
    previous: null,
    by_organization: [
      {
        organization_id: "o1",
        name: "A",
        slug: "a",
        logo_url: null,
        owed_cents: 2,
        settled_cents: 3,
      },
    ],
  },
  exceptions: {
    timezone: "x",
    from: "x",
    to: "x",
    compare: true,
    totals: {
      open: 1,
      overdue: 0,
      due_in_24h: 1,
      amount_open_cents: 500,
      refunded_cents: 0,
      avg_resolution_hours: null,
    },
    previous: null,
  },
  ai: {
    timezone: "x",
    from: "x",
    to: "x",
    compare: true,
    groups: [
      {
        key: "modelo",
        calls: 5,
        failed: 1,
        input_tokens: 10,
        output_tokens: 20,
        thought_tokens: 3,
        avg_latency_ms: 900,
      },
    ],
    previous: null,
  },
  webhooks: {
    timezone: "x",
    from: "x",
    to: "x",
    compare: true,
    totals: {
      attempts: 9,
      delivered: 8,
      failed: 1,
      p50_ms: null,
      p95_ms: null,
      worst_applications: [],
    },
    previous: null,
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("toExecutiveReports", () => {
  const out = toExecutiveReports(raw);

  it("turns funnel totals into ordered steps", () => {
    expect(out.funnel.steps.map((s) => s.key)).toEqual([
      "requests",
      "quoted",
      "pix_created",
      "paid",
      "delivered",
    ]);
    expect(out.funnel.steps.map((s) => s.count)).toEqual([10, 8, 5, 4, 3]);
    expect(out.funnel.previous?.map((s) => s.count)).toEqual([6, 5, 3, 2, 1]);
  });

  it("drops null comparisons instead of passing null on", () => {
    expect(out.revenue.previous).toBeUndefined();
    expect(out.revenue.previous_series).toBeUndefined();
  });

  it("flattens exception and webhook totals", () => {
    expect(out.exceptions.open).toBe(1);
    expect(out.exceptions.avg_resolution_hours).toBeNull();
    expect(out.webhooks.attempts).toBe(9);
  });

  it("keeps fulfillment, AI and commission groups", () => {
    expect(out.fulfillment.groups[0].key).toBe("analysis");
    expect(out.ai.groups[0].calls).toBe(5);
    expect(out.commissions.by_organization[0].name).toBe("A");
  });
});

describe("loadExecutiveReports", () => {
  it("asks every route for the Brasília window and compare flag", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return Response.json({});
      }),
    );
    await loadExecutiveReports(period, true);
    const paths = urls.map((u) => new URL(u, "http://x"));
    expect(paths.map((u) => u.pathname).sort()).toEqual([
      "/v1/team/reports/ai-usage",
      "/v1/team/reports/commissions",
      "/v1/team/reports/fulfillment",
      "/v1/team/reports/funnel",
      "/v1/team/reports/payment-exceptions/summary",
      "/v1/team/reports/revenue",
      "/v1/team/reports/webhooks",
    ]);
    for (const u of paths) {
      expect(u.searchParams.get("from")).toBe("2026-10-01");
      expect(u.searchParams.get("to")).toBe("2026-10-07");
      expect(u.searchParams.get("compare")).toBe("true");
    }
  });

  it("reports the failed sections without discarding the rest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("ai-usage")
          ? Response.json({ code: "x", detail: "falhou" }, { status: 503 })
          : Response.json({}),
      ),
    );
    const result = await loadExecutiveReports(period, false);
    expect(result.failed).toEqual(["ai"]);
    expect(result.raw.ai).toBeUndefined();
    expect(result.raw.revenue).toBeDefined();
  });
});
