import { ApiError, getTeamReport } from "./api";
import type {
  AiUsageGroup,
  CommissionsReport,
  ExceptionsSummary,
  ExecutiveReports,
  FulfillmentGroup,
  FunnelStepKey,
  RevenueReport,
  WebhooksReport,
} from "./executive-contract";
import type { Period } from "./executive-model";

type Echo = { timezone: string; from: string; to: string; compare: boolean };
type FunnelCounts = Record<FunnelStepKey, number>;

/** Response shapes of `/v1/team/reports/*` (backend release f3704d9). */
export type RawReports = {
  revenue: Echo &
    Omit<
      RevenueReport,
      "timezone" | "from" | "to" | "previous" | "previous_series"
    > & {
      previous: RevenueReport["totals"] | null;
      previous_series: RevenueReport["series"] | null;
    };
  funnel: Echo & {
    totals: FunnelCounts;
    previous: FunnelCounts | null;
    by_source?: unknown;
  };
  fulfillment: Echo & {
    groups: FulfillmentGroup[];
    previous: FulfillmentGroup[] | null;
  };
  commissions: Echo & {
    totals: CommissionsReport["totals"];
    previous: CommissionsReport["totals"] | null;
    by_organization: CommissionsReport["by_organization"];
  };
  exceptions: Echo & {
    totals: ExceptionsSummary;
    previous: ExceptionsSummary | null;
  };
  ai: Echo & {
    groups: (AiUsageGroup & { thought_tokens: number })[];
    previous: AiUsageGroup[] | null;
  };
  webhooks: Echo & {
    totals: WebhooksReport;
    previous: WebhooksReport | null;
  };
};

export type ReportSection = keyof RawReports;

export const SECTION_LABELS: Record<ReportSection, string> = {
  revenue: "Receita",
  funnel: "Funil",
  fulfillment: "Entrega",
  commissions: "Comissões",
  exceptions: "Exceções de pagamento",
  ai: "Uso de IA",
  webhooks: "Webhooks",
};

const STEPS: FunnelStepKey[] = [
  "requests",
  "quoted",
  "pix_created",
  "paid",
  "delivered",
];
const steps = (counts: FunnelCounts) =>
  STEPS.map((key) => ({ key, count: counts?.[key] ?? 0 }));

const EMPTY_REVENUE = {
  gross_cents: 0,
  fees_cents: 0,
  tax_cents: 0,
  commission_cents: 0,
  refund_cents: 0,
  net_cents: 0,
  contribution_cents: 0,
  intents_received: 0,
  avg_ticket_cents: 0,
};

/** Maps the backend shapes to what the screens consume; missing sections become empty ones. */
export function toExecutiveReports(raw: Partial<RawReports>): ExecutiveReports {
  const revenue = raw.revenue;
  const funnel = raw.funnel;
  return {
    revenue: {
      timezone: revenue?.timezone ?? "America/Sao_Paulo",
      from: revenue?.from ?? "",
      to: revenue?.to ?? "",
      totals: revenue?.totals ?? EMPTY_REVENUE,
      previous: revenue?.previous ?? undefined,
      series: revenue?.series ?? [],
      previous_series: revenue?.previous_series ?? undefined,
      by_channel: revenue?.by_channel ?? [],
      by_source: revenue?.by_source ?? [],
      by_product: revenue?.by_product ?? [],
      top_organizations: revenue?.top_organizations ?? [],
    },
    funnel: {
      steps: steps(funnel?.totals as FunnelCounts),
      previous: funnel?.previous ? steps(funnel.previous) : undefined,
    },
    fulfillment: {
      group_by: "provider",
      groups: raw.fulfillment?.groups ?? [],
    },
    commissions: {
      totals: raw.commissions?.totals ?? {
        provisional_cents: 0,
        owed_cents: 0,
        settled_cents: 0,
        reversed_cents: 0,
      },
      by_organization: raw.commissions?.by_organization ?? [],
    },
    exceptions: raw.exceptions?.totals ?? {
      open: 0,
      overdue: 0,
      due_in_24h: 0,
      amount_open_cents: 0,
      refunded_cents: 0,
      avg_resolution_hours: null,
    },
    ai: { group_by: "model", groups: raw.ai?.groups ?? [] },
    webhooks: raw.webhooks?.totals ?? {
      attempts: 0,
      delivered: 0,
      failed: 0,
      p50_ms: null,
      p95_ms: null,
      worst_applications: [],
    },
  };
}

export type LoadedReports = {
  raw: Partial<RawReports>;
  failed: ReportSection[];
  unauthorized: boolean;
};

/** Reads the seven reports in parallel; a failing one is listed, not fatal. */
export async function loadExecutiveReports(
  period: Pick<Period, "from" | "to">,
  compare: boolean,
): Promise<LoadedReports> {
  const get = <T>(path: string, extra?: Record<string, string>) =>
    getTeamReport<T>(path, period.from, period.to, compare, extra);
  const calls: { [K in ReportSection]: () => Promise<RawReports[K]> } = {
    revenue: () => get("revenue"),
    funnel: () => get("funnel"),
    fulfillment: () => get("fulfillment", { group_by: "provider" }),
    commissions: () => get("commissions"),
    exceptions: () => get("payment-exceptions/summary"),
    ai: () => get("ai-usage", { group_by: "model" }),
    webhooks: () => get("webhooks"),
  };
  const sections = Object.keys(calls) as ReportSection[];
  const settled = await Promise.allSettled(sections.map((key) => calls[key]()));
  const raw: Partial<RawReports> = {};
  const failed: ReportSection[] = [];
  let unauthorized = false;
  settled.forEach((result, index) => {
    const key = sections[index];
    if (result.status === "fulfilled")
      (raw as Record<string, unknown>)[key] = result.value;
    else {
      failed.push(key);
      if (result.reason instanceof ApiError && result.reason.status === 401)
        unauthorized = true;
    }
  });
  return { raw, failed, unauthorized };
}
