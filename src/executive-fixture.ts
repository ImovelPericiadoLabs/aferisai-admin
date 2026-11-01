import type { ExecutiveReports, RevenueSlice } from "./executive-contract";
import { hash, mulberry32, simulate } from "./executive-fixture-sales";
import type { Period } from "./executive-model";

/** Deterministic labelled data, kept only as a test fixture. */

const sorted = (map: Map<string, RevenueSlice>) =>
  [...map.values()].sort((a, b) => b.gross_cents - a.gross_cents);

export function buildSampleReports(
  period: Period,
  compare: boolean,
): ExecutiveReports {
  const current = simulate(period.from, period.days, 1);
  const previous = compare
    ? simulate(period.previousFrom, period.days, 0.88)
    : null;
  const paid = current.totals.intents_received;
  const pix = Math.round(paid / 0.82);
  const quoted = Math.round(pix / 0.55);
  const requests = Math.round(quoted / 0.8);
  const stepsFor = (p: number) => {
    const px = Math.round(p / 0.82);
    const q = Math.round(px / 0.55);
    return [
      { key: "requests" as const, count: Math.round(q / 0.8) },
      { key: "quoted" as const, count: q },
      { key: "pix_created" as const, count: px },
      { key: "paid" as const, count: p },
      { key: "delivered" as const, count: Math.round(p * 0.96) },
    ];
  };
  const random = mulberry32(hash(`${period.from}:${period.to}`));
  const owed = Math.round(current.totals.commission_cents * 0.34);
  const settled = Math.round(current.totals.commission_cents * 0.52);
  const top = [...current.byOrganization.values()]
    .sort((a, b) => b.gross_cents - a.gross_cents)
    .slice(0, 10);

  return {
    revenue: {
      timezone: "America/Sao_Paulo",
      from: period.from,
      to: period.to,
      totals: current.totals,
      ...(previous
        ? { previous: previous.totals, previous_series: previous.series }
        : {}),
      series: current.series,
      by_channel: sorted(current.byChannel),
      by_source: sorted(current.bySource),
      by_product: sorted(current.byProduct),
      top_organizations: top,
    },
    funnel: {
      steps: [
        { key: "requests", count: requests },
        { key: "quoted", count: quoted },
        { key: "pix_created", count: pix },
        { key: "paid", count: paid },
        { key: "delivered", count: Math.round(paid * 0.96) },
      ],
      ...(previous
        ? { previous: stepsFor(previous.totals.intents_received) }
        : {}),
    },
    fulfillment: {
      group_by: "provider",
      groups: [
        {
          key: "ia_upload",
          completed: Math.round(paid * 0.58 * 0.97),
          failed: Math.round(paid * 0.58 * 0.02),
          unknown: Math.round(paid * 0.58 * 0.01),
          p50_seconds: 190,
          p95_seconds: 640,
        },
        {
          key: "onr",
          completed: Math.round(paid * 0.24 * 0.93),
          failed: Math.round(paid * 0.24 * 0.05),
          unknown: Math.round(paid * 0.24 * 0.02),
          p50_seconds: 3600 * 2 + 600,
          p95_seconds: 3600 * 9,
        },
        {
          key: "infosimples",
          completed: Math.round(paid * 0.18 * 0.95),
          failed: Math.round(paid * 0.18 * 0.04),
          unknown: Math.round(paid * 0.18 * 0.01),
          p50_seconds: 1500,
          p95_seconds: 5400,
        },
      ],
    },
    commissions: {
      totals: {
        provisional_cents:
          current.totals.commission_cents - owed - settled - 4200,
        owed_cents: owed,
        settled_cents: settled,
        reversed_cents: 4200,
      },
      by_organization: top.slice(0, 6).map((org) => ({
        organization_id: org.organization_id,
        name: org.name,
        slug: "x",
        logo_url: null,
        owed_cents: Math.round(org.commission_cents * 0.34),
        settled_cents: Math.round(org.commission_cents * 0.52),
      })),
    },
    exceptions: {
      open: 9,
      overdue: 3,
      due_in_24h: 2,
      amount_open_cents: 9 * 7900 + 3 * 4900,
      refunded_cents: current.totals.refund_cents,
      avg_resolution_hours: 31.5,
    },
    ai: {
      group_by: "model",
      groups: [
        {
          key: "modelo-a",
          calls: Math.round(paid * 0.58 * 6.2),
          failed: Math.round(paid * 0.58 * 0.18),
          input_tokens: Math.round(paid * 0.58 * 41_000),
          output_tokens: Math.round(paid * 0.58 * 5_800),
          avg_latency_ms: 18_400 + Math.round(random() * 600),
        },
        {
          key: "modelo-b",
          calls: Math.round(paid * 0.58 * 1.4),
          failed: Math.round(paid * 0.58 * 0.07),
          input_tokens: Math.round(paid * 0.58 * 9_000),
          output_tokens: Math.round(paid * 0.58 * 1_100),
          avg_latency_ms: 7_900,
        },
      ],
    },
    webhooks: {
      attempts: Math.round(paid * 0.26 * 2.1),
      delivered: Math.round(paid * 0.26 * 2.1 * 0.955),
      failed: Math.round(paid * 0.26 * 2.1 * 0.04),
      p50_ms: 268,
      p95_ms: 1520,
      worst_applications: [
        {
          application_id: "exemplo-app-1",
          name: "Aplicação exemplo 1",
          failure_rate_bps: 910,
        },
        {
          application_id: "exemplo-app-2",
          name: "Aplicação exemplo 2",
          failure_rate_bps: 420,
        },
      ],
    },
  };
}
