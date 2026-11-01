import { request } from "./api-core";

export type PromotionAsset = {
  id: string;
  policy_version_id: string;
  organization_id: string;
  kind: string;
  public_label: string | null;
  valid_from: string;
  valid_until: string;
  use_limit: number | null;
  use_count: number;
  status: string;
  suspended_at: string | null;
  created_at: string;
};

export type PromotionCreateResult = PromotionAsset & { plain_code: string };

export type PromotionPage = {
  items: PromotionAsset[];
  next_cursor: string | null;
};

export type CreatePromotionBody = {
  policy_version_id: string;
  organization_id: string;
  kind: "coupon" | "link";
  valid_from: string;
  valid_until: string;
  public_label: string | null;
  use_limit: number | null;
};

export const listPromotions = (cursor?: string, organization_id?: string) =>
  request<PromotionPage>(
    `/v1/team/promotions?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${organization_id ? `&organization_id=${encodeURIComponent(organization_id)}` : ""}`,
    { method: "GET" },
  );

export const createPromotion = (body: CreatePromotionBody, csrfToken: string) =>
  request<PromotionCreateResult>("/v1/team/promotions", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const suspendPromotion = (assetId: string, csrfToken: string) =>
  request<PromotionAsset>(
    `/v1/team/promotions/${encodeURIComponent(assetId)}/suspend`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({}),
    },
  );
