import { request } from "./api-core";

export interface DashboardMetrics {
  analyses?: {
    queued: number;
    running: number;
    completed: number;
    error: number;
  };
  payments?: { prepared: number; received: number; review: number };
  registry_requests?: {
    pending: number;
    dispatched: number;
    confirmed: number;
    error: number;
  };
  commissions?: { provisional: number; owed: number; settled: number };
}

export const getDashboardMetrics = () =>
  request<DashboardMetrics>("/v1/team/dashboard", { method: "GET" });

export type OperationsOverview = {
  checked_at: string;
  services: {
    code: string;
    label: string;
    state: "operational" | "degraded" | "unavailable" | "unverified";
    message: string | null;
    observed_at: string | null;
  }[];
  pools: {
    pool_key: string;
    kind: string;
    observed_limit: number;
    external_reserved: number;
    in_flight: number;
    unknown: number;
    available: number;
    waits_in_window: number;
    situation: string;
  }[];
  accounts: {
    account_id: string;
    label: string;
    pool_key: string;
    status: string;
    model: string;
    priority: number;
    concurrent_limit: number;
    daily_limit: number;
    daily_cost_limit_cents: number;
    calls_today: number;
    cost_cents_today: number;
    unpriced_calls_today: number;
    rpm: number;
    calls_in_window: number;
    input_tokens_reported: number;
    output_tokens_reported: number;
    waits_in_window: number;
  }[];
  hourly_capacity: {
    hour: string;
    calls: number;
    unknown: number;
    waits: number;
    cost_cents: number;
  }[];
  provider_errors: { code: string; count: number }[];
  pending_capacity_waits: number;
  oldest_pending_wait_at: string | null;
  reading: string;
};

export const getOperationsOverview = () =>
  request<OperationsOverview>("/v1/team/operations", { method: "GET" });

export type DashboardDailyCount = { date: string; count: number };

export type DashboardDailySeries = {
  current: DashboardDailyCount[];
  previous?: DashboardDailyCount[];
};

export type DashboardSeriesResponse = {
  timezone: "UTC";
  start_date: string;
  end_date: string;
  compare: boolean;
  series: Partial<Record<keyof DashboardMetrics, DashboardDailySeries>>;
};

export const getDashboardSeries = (
  startDate: string,
  endDate: string,
  compare: boolean,
) => {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    compare: String(compare),
  });
  return request<DashboardSeriesResponse>(
    `/v1/team/dashboard/series?${params.toString()}`,
    {
      method: "GET",
    },
  );
};

export type PartnerActivity = {
  organization_id: string;
  application_id: string | null;
  since: string;
  until: string;
  active_connections: number;
  analysis_submissions: number;
  analysis_completions: number;
  registry_requests: number;
  webhook_attempts: number;
  webhook_delivered: number;
  webhook_latency_p50_ms: number | null;
  webhook_latency_p95_ms: number | null;
  coupon_redemptions: number;
  link_redemptions: number;
};

export const getPartnerMetrics = (days: number, applicationId?: string) =>
  request<PartnerActivity>(
    `${applicationId ? `/v1/partner/applications/${encodeURIComponent(applicationId)}/metrics` : "/v1/partner/metrics"}?days=${days}`,
    { method: "GET" },
  );

/** Read-only executive aggregates (`/v1/team/reports/*`); the window is in America/Sao_Paulo. */
export const getTeamReport = <T>(
  path: string,
  from: string,
  to: string,
  compare: boolean,
  extra: Record<string, string> = {},
) => {
  const params = new URLSearchParams({
    from,
    to,
    compare: String(compare),
    ...extra,
  });
  return request<T>(`/v1/team/reports/${path}?${params.toString()}`, {
    method: "GET",
  });
};
