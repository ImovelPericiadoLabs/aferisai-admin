import { request } from "./api-core";

export type CommercialPolicy = {
  id: string;
  organization_id: string | null;
  application_id: string | null;
  channel: "site" | "integration" | "promotion";
  source: "number" | "cnm" | "address" | "upload";
  item_code: string;
  attribution: "public" | "connected" | "coupon" | "link";
  valid_from: string;
  valid_until: string;
  discount_fixed_cents: number;
  discount_rate_bps: number;
  commission_fixed_cents: number;
  commission_rate_bps: number;
  status: "draft" | "published" | "suspended";
  published_at: string | null;
  suspended_at: string | null;
};

export type CommercialPolicyPage = {
  items: CommercialPolicy[];
  next_cursor: string | null;
};

export type CommercialPolicyDraft = Omit<
  CommercialPolicy,
  "id" | "status" | "published_at" | "suspended_at"
> & { reason: string };

export const listCommercialPolicies = (
  cursor?: string,
  filters?: {
    channel?: CommercialPolicy["channel"];
    status?: CommercialPolicy["status"];
  },
) => {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  if (filters?.channel) params.set("channel", filters.channel);
  if (filters?.status) params.set("status", filters.status);
  return request<CommercialPolicyPage>(
    `/v1/team/commercial-policies?${params}`,
    {
      method: "GET",
    },
  );
};

export const createCommercialPolicyDraft = (
  body: CommercialPolicyDraft,
  csrfToken: string,
) =>
  request<CommercialPolicy>("/v1/team/commercial-policies", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const decideCommercialPolicy = (
  id: string,
  action: "publish" | "suspend",
  reason: string,
  csrfToken: string,
) =>
  request<CommercialPolicy>(
    `/v1/team/commercial-policies/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason }),
    },
  );

export type CommercialPolicyPreview = {
  policy_version_id: string;
  policy_status: string;
  base_price_cents: number;
  item_count: number;
  discount_fixed_cents: number;
  discount_rate_cents: number;
  discount_cents: number;
  commission_fixed_cents: number;
  commission_rate_cents: number;
  commission_cents: number;
  payable_cents: number;
  ineligible_reason: string | null;
};

export const updateCommercialPolicyDraft = (
  id: string,
  body: CommercialPolicyDraft,
  csrfToken: string,
) =>
  request<CommercialPolicy>(
    `/v1/team/commercial-policies/${encodeURIComponent(id)}/draft`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

export const previewCommercialPolicy = (
  id: string,
  basePriceCents: number,
  itemCount: number,
  csrfToken: string,
) =>
  request<CommercialPolicyPreview>(
    `/v1/team/commercial-policies/${encodeURIComponent(id)}/preview`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({
        base_price_cents: basePriceCents,
        item_count: itemCount,
      }),
    },
  );
