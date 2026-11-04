import { request } from "./api-core";

export type ExceptionAffectedItem = {
  ordinal: number;
  work_id: string | null;
  work_status: string | null;
  error_code: string | null;
  item_status?: string | null;
  /** Only present once the backend exposes it; lets the original be opened directly. */
  request_id?: string | null;
};

export type PaymentExceptionCase = {
  id: string;
  work_id: string;
  request_id?: string | null;
  opened_at: string;
  due_at: string;
  reason_code: string;
  amount_cents: number;
  funding_source?: "pix" | "credits";
  customer_name?: string | null;
  customer_email?: string | null;
  latest_proposal_id: string | null;
  proposed_resolution: "correct" | "refund" | null;
  proposal_reason: string | null;
  proposal_actor_id: string | null;
  proposal_at: string | null;
  resolution: "correct" | "refund" | null;
  financial_decision_id: string | null;
  manager_assignee_id: string | null;
  financial_assignee_id: string | null;
  execution_status: "attempted" | "pending" | "done" | "unknown" | null;
  /** Documents of the same registry purchase; empty for uploaded-file cases. */
  affected_items?: ExceptionAffectedItem[];
};

export type PaymentExceptionPage = {
  items: PaymentExceptionCase[];
  next_cursor: string | null;
};

export const listPaymentExceptions = (
  cursor?: string,
  state: "open" | "done" | "all" = "all",
) =>
  request<PaymentExceptionPage>(
    `/v1/team/payment-exceptions?limit=20&state=${state}${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const claimPaymentException = (caseId: string, csrfToken: string) =>
  request<{ member_id: string }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/claims`,
    { method: "POST", headers: { "X-CSRF-Token": csrfToken } },
  );

export const reassignPaymentException = (
  caseId: string,
  role: "manager" | "financial",
  memberId: string,
  reason: string,
  csrfToken: string,
) =>
  request<{ member_id: string }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/reassignments`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ role, member_id: memberId, reason }),
    },
  );

export const proposePaymentException = (
  caseId: string,
  resolution: "correct" | "refund",
  reason: string,
  csrfToken: string,
) =>
  request<{ id: string }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/proposals`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ resolution, reason }),
    },
  );

export const confirmPaymentException = (
  caseId: string,
  proposalId: string,
  reason: string,
  csrfToken: string,
) =>
  request<{ id: string }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/confirmations`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ proposal_id: proposalId, reason }),
    },
  );

export const executePaymentException = (
  caseId: string,
  action:
    | "refund-attempts"
    | "refund-reconciliations"
    | "correction-verifications"
    | "delivery-retries",
  csrfToken: string,
) =>
  request<
    | { id: string; status: "attempted" | "pending" | "done" | "unknown" }
    | { queued_items: number }
  >(`/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/${action}`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
