import { request } from "./api-core";

// --- Submission reconciliation (B2) ---

export type UncertainSubmissionItem = {
  item_id: string;
  operation_id: string;
  provider: string;
  created_at: string;
  attempted_at: string;
  customer_refunded: boolean;
  reconciliation_status: "action_required" | "refunded_record";
};

export type UncertainSubmissionPage = {
  items: UncertainSubmissionItem[];
  next_cursor: string | null;
};

export type ReconcileDecisionResponse = {
  item_id: string;
  decision: "no_purchase" | "protocol_confirmed";
};

export type SupplierEvidence = {
  item_id: string;
  response: {
    captured: boolean;
    failure_kind: string | null;
    http_status: number | null;
    content_type: string | null;
    response_text: string | null;
    response_sha256: string | null;
    captured_at: string | null;
  };
  order_list: {
    status: "checked" | "unavailable" | "account_changed" | "not_applicable";
    checked_at: string | null;
    listed_count: number | null;
    newest_date: string | null;
    matching_orders: { protocol: string; date: string }[];
    limit_note: string;
  };
};

export const listUncertainSubmissions = (
  cursor?: string,
  state: "active" | "refunded" | "all" = "all",
) =>
  request<UncertainSubmissionPage>(
    `/v1/team/registry-submissions/uncertain?limit=20&state=${state}${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const readSupplierEvidence = (
  itemId: string,
  reason: string,
  csrfToken: string,
) =>
  request<SupplierEvidence>(
    `/v1/team/registry-submissions/${encodeURIComponent(itemId)}/evidence`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason }),
    },
  );

export const reconcileNoPurchase = (
  itemId: string,
  reason: string,
  csrfToken: string,
) =>
  request<ReconcileDecisionResponse>(
    `/v1/team/registry-submissions/${encodeURIComponent(itemId)}/reconcile/no-purchase`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason }),
    },
  );

export const reconcileProtocol = (
  itemId: string,
  protocol: string,
  reason: string,
  csrfToken: string,
) =>
  request<ReconcileDecisionResponse>(
    `/v1/team/registry-submissions/${encodeURIComponent(itemId)}/reconcile/protocol`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ protocol, reason }),
    },
  );
