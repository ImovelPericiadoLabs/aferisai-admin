import type { PaymentExceptionCase } from "./api";

export const NOW = Date.parse("2026-10-23T12:00:00Z");
export const H = 3600_000;

export function kase(
  overrides: Partial<PaymentExceptionCase> = {},
): PaymentExceptionCase {
  return {
    id: "c1",
    work_id: "w1",
    opened_at: "2026-10-20T12:00:00Z",
    due_at: "2026-10-30T12:00:00Z",
    reason_code: "paid_without_delivery",
    amount_cents: 1000,
    latest_proposal_id: null,
    proposed_resolution: null,
    proposal_reason: null,
    proposal_actor_id: null,
    proposal_at: null,
    resolution: null,
    financial_decision_id: null,
    manager_assignee_id: null,
    financial_assignee_id: null,
    execution_status: null,
    affected_items: [],
    ...overrides,
  };
}
