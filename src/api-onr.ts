import { request } from "./api-core";

// --- ONR preview review (B1.2) ---

export type OnrPreviewAttentionItem = {
  attempt_id: string;
  operation_id: string;
  started_at: string;
  latest_review_id: string | null;
  latest_decision: string | null;
  review_version: number | null;
};

export type OnrPreviewAttentionPage = {
  items: OnrPreviewAttentionItem[];
  next_cursor: string | null;
};

export type OnrPortalOrder = {
  protocol: string;
  date: string;
  status: string;
};

export type OnrPortalOrdersInspection = {
  attempt_id: string;
  observed_at: string;
  listing_sha256: string;
  coverage: string;
  pages_read: number;
  orders: OnrPortalOrder[];
};

export type OnrPreviewReviewHistory = {
  items: {
    id: string;
    version: number;
    decision: string;
    reason: string;
    portal_orders_sha256: string;
    observed_at: string;
    actor_team_member_id: string;
    previous_review_id: string | null;
  }[];
  next_version: number | null;
};

export type OnrPortalSolicitation = {
  protocol: string;
  office: string;
  product: string;
  status: string;
};

export type OnrPortalOrderDetail = {
  order_protocol: string;
  listing_sha256: string;
  observed_at: string;
  coverage: string;
  solicitations: OnrPortalSolicitation[];
};

export type OnrPreviewReviewResult = { id: string };

export const listOnrPreviewAttempts = (cursor?: string) =>
  request<OnrPreviewAttentionPage>(
    `/v1/team/onr-preview-attempts?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const getOnrOrdersInspection = (attemptId: string) =>
  request<OnrPortalOrdersInspection>(
    `/v1/team/onr-preview-attempts/${encodeURIComponent(attemptId)}/orders-inspection`,
    { method: "GET" },
  );

export const getOnrPreviewReviews = (attemptId: string, afterVersion = 0) =>
  request<OnrPreviewReviewHistory>(
    `/v1/team/onr-preview-attempts/${encodeURIComponent(attemptId)}/reviews?limit=50&after_version=${afterVersion}`,
    { method: "GET" },
  );

/** Opens one order of the observed listing; the server re-reads the portal and checks the digest. */
export const getOnrOrderDetail = (
  attemptId: string,
  protocol: string,
  expectedListingSha256: string,
) =>
  request<OnrPortalOrderDetail>(
    `/v1/team/onr-preview-attempts/${encodeURIComponent(attemptId)}/orders/${encodeURIComponent(protocol)}?expected_listing_sha256=${expectedListingSha256}`,
    { method: "GET" },
  );

export const createOnrPreviewReview = (
  attemptId: string,
  decision: string,
  reason: string,
  previousReviewId: string | null,
  expectedListingSha256: string,
  csrfToken: string,
) =>
  request<OnrPreviewReviewResult>(
    `/v1/team/onr-preview-attempts/${encodeURIComponent(attemptId)}/reviews`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({
        decision,
        reason,
        previous_review_id: previousReviewId,
        expected_listing_sha256: expectedListingSha256,
      }),
    },
  );

export type OnrEndpoint = {
  origin: string;
  mode: "official" | "proxy";
  proxy_key_configured: boolean;
  version: number;
};

export const getOnrEndpoint = (accountId: string) =>
  request<OnrEndpoint>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/onr-endpoint`,
    { method: "GET" },
  );

export const setOnrEndpoint = (
  accountId: string,
  origin: string,
  proxyKey: string | null,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) =>
  request<OnrEndpoint>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/onr-endpoint`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({
        origin,
        ...(proxyKey ? { proxy_key: proxyKey } : {}),
        expected_version: expectedVersion,
        reason,
      }),
    },
  );

export const resetOnrEndpoint = (
  accountId: string,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) =>
  request<OnrEndpoint>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/onr-endpoint/reset`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ expected_version: expectedVersion, reason }),
    },
  );
