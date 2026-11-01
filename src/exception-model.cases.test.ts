import { describe, expect, it } from "vitest";
import type { PaymentExceptionCase } from "./api";
import {
  affectedItemRows,
  canViewOriginals,
  filterCases,
  originalTargets,
  sortByUrgency,
} from "./exception-model";
import { H, NOW, kase } from "./exception-model.fixture";

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
    expect(filterCases(items, "done", "m1", NOW).map((x) => x.id)).toEqual([
      "done",
    ]);
  });
});

describe("affectedItemRows", () => {
  it("is empty for upload cases and for older responses without the field", () => {
    expect(affectedItemRows(kase())).toEqual([]);
    const legacy = kase();
    delete (legacy as Partial<PaymentExceptionCase>).affected_items;
    expect(affectedItemRows(legacy)).toEqual([]);
  });
  it("orders by document position and describes each item", () => {
    const rows = affectedItemRows(
      kase({
        affected_items: [
          { ordinal: 3, work_id: null, work_status: null, error_code: null },
          {
            ordinal: 1,
            work_id: "w1",
            work_status: "error",
            error_code: "analysis.blocked",
          },
        ],
      }),
    );
    expect(rows).toEqual([
      {
        key: "1",
        title: "Documento 1",
        detail: "Trabalho w1 · situação error",
        error: "analysis.blocked",
      },
      {
        key: "3",
        title: "Documento 3",
        detail: "Trabalho ainda não criado",
        error: null,
      },
    ]);
  });
});

describe("canViewOriginals", () => {
  it("is for the roles the backend lets open an original", () => {
    expect(canViewOriginals("administrator")).toBe(true);
    expect(canViewOriginals("manager")).toBe(true);
    expect(canViewOriginals("financial")).toBe(false);
    expect(canViewOriginals("viewer")).toBe(false);
  });
});

describe("originalTargets", () => {
  it("offers the case work and each purchase document that has a work", () => {
    const targets = originalTargets(
      kase({
        work_id: "w0",
        request_id: "r0",
        affected_items: [
          { ordinal: 2, work_id: null, work_status: null, error_code: null },
          {
            ordinal: 1,
            work_id: "w1",
            work_status: "error",
            error_code: null,
            request_id: "r1",
          },
          { ordinal: 3, work_id: "w3", work_status: "done", error_code: null },
        ],
      }),
    );
    expect(targets).toEqual([
      {
        key: "case",
        label: "Documento do caso",
        workId: "w0",
        requestId: "r0",
      },
      { key: "item-1", label: "Documento 1", workId: "w1", requestId: "r1" },
      { key: "item-3", label: "Documento 3", workId: "w3", requestId: null },
    ]);
  });
  it("does not repeat the case document when a purchase item is the same work", () => {
    const targets = originalTargets(
      kase({
        work_id: "w1",
        affected_items: [
          { ordinal: 1, work_id: "w1", work_status: "error", error_code: null },
        ],
      }),
    );
    expect(targets.map((t) => t.key)).toEqual(["item-1"]);
  });
});
