/**
 * Contract proposed to the backend in pedido 006 (construtor/backend/pedidos/006-*.md).
 * Money is in cents, durations in seconds, rates in basis points, days in America/Sao_Paulo.
 * Until the routes exist the screen is fed by `executive-sample.ts` and says so.
 */
export type RevenueTotals = {
  gross_cents: number;
  fees_cents: number;
  tax_cents: number;
  commission_cents: number;
  refund_cents: number;
  net_cents: number;
  contribution_cents: number;
  intents_received: number;
  avg_ticket_cents: number;
};

export type RevenueDay = {
  date: string;
  gross_cents: number;
  contribution_cents: number;
  intents: number;
};

export type RevenueSlice = {
  key: string;
  gross_cents: number;
  contribution_cents: number;
  intents: number;
};

export type OrganizationRevenue = {
  organization_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  gross_cents: number;
  commission_cents: number;
  intents: number;
};

export type RevenueReport = {
  timezone: string;
  from: string;
  to: string;
  totals: RevenueTotals;
  previous?: RevenueTotals;
  series: RevenueDay[];
  previous_series?: RevenueDay[];
  by_channel: RevenueSlice[];
  by_source: RevenueSlice[];
  by_product: RevenueSlice[];
  top_organizations: OrganizationRevenue[];
};

export type FunnelStepKey =
  "requests" | "quoted" | "pix_created" | "paid" | "delivered";

export type FunnelReport = {
  steps: { key: FunnelStepKey; count: number }[];
  previous?: { key: FunnelStepKey; count: number }[];
};

export type FulfillmentGroup = {
  key: string;
  completed: number;
  failed: number;
  unknown: number;
  p50_seconds: number | null;
  p95_seconds: number | null;
};

export type FulfillmentReport = {
  group_by: string;
  groups: FulfillmentGroup[];
};

export type CommissionsReport = {
  totals: {
    provisional_cents: number;
    owed_cents: number;
    settled_cents: number;
    reversed_cents: number;
  };
  by_organization: {
    organization_id: string;
    name: string;
    owed_cents: number;
    settled_cents: number;
  }[];
};

export type ExceptionsSummary = {
  open: number;
  overdue: number;
  due_in_24h: number;
  amount_open_cents: number;
  refunded_cents: number;
  avg_resolution_hours: number | null;
};

export type AiUsageGroup = {
  key: string;
  calls: number;
  failed: number;
  input_tokens: number;
  output_tokens: number;
  avg_latency_ms: number | null;
};

export type AiUsageReport = { group_by: string; groups: AiUsageGroup[] };

export type WebhooksReport = {
  attempts: number;
  delivered: number;
  failed: number;
  p50_ms: number | null;
  p95_ms: number | null;
  worst_applications: {
    application_id: string;
    name: string;
    failure_rate_bps: number;
  }[];
};

export type ExecutiveReports = {
  revenue: RevenueReport;
  funnel: FunnelReport;
  fulfillment: FulfillmentReport;
  commissions: CommissionsReport;
  exceptions: ExceptionsSummary;
  ai: AiUsageReport;
  webhooks: WebhooksReport;
};
