import { request } from "./api-core";

export type CommissionEntry = {
  id: string;
  payment_intent_id: string;
  policy_version_id: string;
  beneficiary_organization_id: string;
  item_kind: string;
  amount_cents: number;
  status: "provisional" | "owed" | "settled" | "reversed";
  idempotency_key: string;
  settlement_id: string | null;
  created_at: string;
};

export type CommissionEntryPage = {
  items: CommissionEntry[];
  next_cursor: string | null;
};

export type CommissionSettlement = {
  id: string;
  beneficiary_organization_id: string;
  external_reference: string;
  amount_cents: number;
  evidence_note: string;
  settled_at: string;
  created_at: string;
};

export type CommissionSettlementPage = {
  items: CommissionSettlement[];
  next_cursor: string | null;
};

export type CreateSettlementBody = {
  beneficiary_organization_id: string;
  external_reference: string;
  amount_cents: number;
  evidence_note: string;
  settled_at: string;
  entry_ids: string[];
};

export const listCommissionEntries = (
  cursor?: string,
  beneficiary_organization_id?: string,
  status?: string,
) =>
  request<CommissionEntryPage>(
    `/v1/team/commissions?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${beneficiary_organization_id ? `&beneficiary_organization_id=${encodeURIComponent(beneficiary_organization_id)}` : ""}${status ? `&status=${encodeURIComponent(status)}` : ""}`,
    { method: "GET" },
  );

export const listCommissionSettlements = (
  cursor?: string,
  beneficiary_organization_id?: string,
) =>
  request<CommissionSettlementPage>(
    `/v1/team/commission-settlements?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${beneficiary_organization_id ? `&beneficiary_organization_id=${encodeURIComponent(beneficiary_organization_id)}` : ""}`,
    { method: "GET" },
  );

export const createCommissionSettlement = (
  body: CreateSettlementBody,
  csrfToken: string,
) =>
  request<CommissionSettlement>("/v1/team/commission-settlements", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const reverseCommissionEntry = (
  entryId: string,
  reason: string,
  csrfToken: string,
) =>
  request<CommissionEntry>(
    `/v1/team/commissions/${encodeURIComponent(entryId)}/reverse`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason }),
    },
  );

export type PartnerCommissionItem = {
  id: string;
  item_kind: string;
  amount_cents: number;
  status: string;
  created_at: string;
  settled_at: string | null;
};

export type PartnerCommissionStatement = {
  organization_id: string;
  totals: {
    provisional_cents: number;
    owed_cents: number;
    settled_cents: number;
    reversed_cents: number;
  };
  items: PartnerCommissionItem[];
  next_cursor: string | null;
};

export const getPartnerCommissions = (cursor?: string) =>
  request<PartnerCommissionStatement>(
    `/v1/partner/commissions?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );
