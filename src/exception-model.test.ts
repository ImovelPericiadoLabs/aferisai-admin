import { describe, expect, it } from "vitest";
import type { PaymentExceptionCase } from "./api";
import {
  dueState,
  filterCases,
  nextAction,
  reassignBlock,
  sortByUrgency,
  stageOf,
} from "./exception-model";

const NOW = Date.parse("2026-10-23T12:00:00Z");
const H = 3600_000;

function kase(
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
    ...overrides,
  };
}

describe("dueState", () => {
  it("is overdue with elapsed time", () => {
    expect(dueState(new Date(NOW - 50 * H).toISOString(), NOW)).toEqual({
      tone: "danger",
      label: "Atrasado há 2 d",
      overdue: true,
    });
    expect(dueState(new Date(NOW - 3 * H).toISOString(), NOW)).toMatchObject({
      label: "Atrasado há 3 h",
      overdue: true,
    });
    expect(
      dueState(new Date(NOW - 10 * 60_000).toISOString(), NOW),
    ).toMatchObject({ label: "Atrasado há 10 min" });
  });
  it("does not show zero minutes", () => {
    expect(dueState(new Date(NOW - 5_000).toISOString(), NOW).label).toBe(
      "Atrasado há menos de 1 min",
    );
    expect(dueState(new Date(NOW + 5_000).toISOString(), NOW).label).toBe(
      "Vence em menos de 1 min",
    );
  });
  it("warns inside 24 hours and is neutral beyond", () => {
    expect(dueState(new Date(NOW + 5 * H).toISOString(), NOW)).toEqual({
      tone: "warning",
      label: "Vence em 5 h",
      overdue: false,
    });
    expect(dueState(new Date(NOW + 72 * H).toISOString(), NOW)).toEqual({
      tone: "neutral",
      label: "Vence em 3 d",
      overdue: false,
    });
  });
});

describe("stageOf", () => {
  it("follows the workflow", () => {
    expect(stageOf(kase())).toBe("awaiting-proposal");
    expect(stageOf(kase({ latest_proposal_id: "p" }))).toBe(
      "awaiting-financial",
    );
    expect(
      stageOf(kase({ latest_proposal_id: "p", financial_decision_id: "d" })),
    ).toBe("executing");
    expect(
      stageOf(kase({ financial_decision_id: "d", execution_status: "done" })),
    ).toBe("done");
  });
});

describe("nextAction", () => {
  it("lets a manager claim an unassigned case", () => {
    expect(nextAction(kase(), "manager", "m1")).toEqual({ kind: "claim" });
  });
  it("lets the assigned manager propose", () => {
    expect(
      nextAction(kase({ manager_assignee_id: "m1" }), "manager", "m1"),
    ).toEqual({ kind: "propose" });
  });
  it("explains when someone else has the case", () => {
    expect(
      nextAction(kase({ manager_assignee_id: "m2" }), "manager", "m1"),
    ).toEqual({
      kind: "wait",
      reason: "O caso foi atribuído a outra pessoa do seu papel.",
    });
  });
  it("makes the financial role wait for a proposal, then claim, then confirm", () => {
    expect(nextAction(kase(), "financial", "f1")).toEqual({
      kind: "wait",
      reason: "Aguardando proposta do gestor.",
    });
    expect(
      nextAction(kase({ latest_proposal_id: "p" }), "financial", "f1"),
    ).toEqual({ kind: "claim" });
    expect(
      nextAction(
        kase({ latest_proposal_id: "p", financial_assignee_id: "f1" }),
        "financial",
        "f1",
      ),
    ).toEqual({ kind: "confirm" });
  });
  it("drives execution for the assigned financial person", () => {
    const decided = {
      latest_proposal_id: "p",
      financial_decision_id: "d",
      financial_assignee_id: "f1",
    };
    expect(
      nextAction(kase({ ...decided, resolution: "refund" }), "financial", "f1"),
    ).toEqual({ kind: "start-refund" });
    expect(
      nextAction(
        kase({ ...decided, resolution: "refund", execution_status: "pending" }),
        "financial",
        "f1",
      ),
    ).toEqual({ kind: "reconcile-refund" });
    expect(
      nextAction(
        kase({ ...decided, resolution: "correct" }),
        "financial",
        "f1",
      ),
    ).toEqual({ kind: "verify-correction" });
    expect(
      nextAction(
        kase({ ...decided, resolution: "correct", execution_status: "done" }),
        "financial",
        "f1",
      ),
    ).toEqual({ kind: "none" });
  });
  it("tells others that execution belongs to the financial owner", () => {
    const decided = kase({
      financial_decision_id: "d",
      financial_assignee_id: "f1",
      resolution: "refund",
    });
    expect(nextAction(decided, "manager", "m1")).toEqual({
      kind: "wait",
      reason: "A execução é feita pela pessoa responsável no financeiro.",
    });
  });
  it("only lets viewers read", () => {
    expect(nextAction(kase(), "viewer", "v1")).toEqual({
      kind: "wait",
      reason: "Seu perfil só consulta.",
    });
  });
});

describe("reassignBlock", () => {
  it("is admin only and blocked after a decision", () => {
    expect(reassignBlock(kase(), "manager", "manager")).toBe(
      "Somente administradores reatribuem casos.",
    );
    expect(
      reassignBlock(
        kase({ financial_decision_id: "d" }),
        "administrator",
        "financial",
      ),
    ).toBe("O caso já tem decisão financeira.");
  });
  it("blocks the manager slot once a proposal exists", () => {
    expect(
      reassignBlock(
        kase({ latest_proposal_id: "p" }),
        "administrator",
        "manager",
      ),
    ).toBe("O gestor não pode mudar depois da proposta.");
    expect(
      reassignBlock(
        kase({ latest_proposal_id: "p" }),
        "administrator",
        "financial",
      ),
    ).toBeNull();
    expect(reassignBlock(kase(), "administrator", "manager")).toBeNull();
  });
});

describe("sortByUrgency and filterCases", () => {
  const items = [
    kase({ id: "later", due_at: new Date(NOW + 48 * H).toISOString() }),
    kase({
      id: "done",
      due_at: new Date(NOW - 99 * H).toISOString(),
      financial_decision_id: "d",
      execution_status: "done",
    }),
    kase({
      id: "late",
      due_at: new Date(NOW - 5 * H).toISOString(),
      manager_assignee_id: "m1",
    }),
    kase({ id: "soon", due_at: new Date(NOW + 2 * H).toISOString() }),
  ];
  it("puts overdue first, then by due date, and finished last", () => {
    expect(sortByUrgency(items, NOW).map((x) => x.id)).toEqual([
      "late",
      "soon",
      "later",
      "done",
    ]);
  });
  it("filters", () => {
    expect(filterCases(items, "overdue", "m1", NOW).map((x) => x.id)).toEqual([
      "late",
    ]);
    expect(filterCases(items, "mine", "m1", NOW).map((x) => x.id)).toEqual([
      "late",
    ]);
    expect(filterCases(items, "all", "m1", NOW)).toHaveLength(4);
    expect(filterCases(items, "executing", "m1", NOW)).toHaveLength(0);
  });
});
