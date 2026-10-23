import { describe, expect, it } from "vitest";
import {
  REQUEST_VIEWS,
  requestKpis,
  requestTimeline,
  requestTone,
  requestView,
  viewCounts,
  type RequestRow,
} from "./requests-model";

const row = (over: Partial<RequestRow> = {}): RequestRow => ({
  request_id: "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a0",
  created_at: "2026-10-23T16:50:00Z",
  page_count: 2,
  document_state: "available",
  admission_outcome: "eligible",
  payment_status: null,
  charge_attempt: null,
  work_id: null,
  work_status: null,
  ...over,
});

describe("requestView", () => {
  it("flags uncertain money and failed work as attention", () => {
    expect(requestView(row({ charge_attempt: "unknown" }))).toBe("attention");
    expect(requestView(row({ payment_status: "review" }))).toBe("attention");
    expect(requestView(row({ work_status: "failed" }))).toBe("attention");
    expect(requestView(row({ work_status: "unknown" }))).toBe("attention");
    expect(requestView(row({ work_status: "suspended" }))).toBe("attention");
  });
  it("tells waiting-for-payment, in analysis and done apart", () => {
    expect(requestView(row({ payment_status: "prepared" }))).toBe("awaiting_payment");
    expect(requestView(row())).toBe("awaiting_payment");
    expect(requestView(row({ payment_status: "received", work_status: "running" }))).toBe("in_analysis");
    expect(requestView(row({ payment_status: "received", work_status: "pending" }))).toBe("in_analysis");
    expect(requestView(row({ payment_status: "received", work_status: "completed" }))).toBe("done");
  });
});

describe("requestTone", () => {
  it("is danger for failed work or an uncertain charge, warn for review", () => {
    expect(requestTone(row({ work_status: "failed" }))).toBe("danger");
    expect(requestTone(row({ charge_attempt: "unknown" }))).toBe("danger");
    expect(requestTone(row({ payment_status: "review" }))).toBe("warn");
    expect(requestTone(row({ work_status: "suspended" }))).toBe("warn");
    expect(requestTone(row({ payment_status: "received", work_status: "completed" }))).toBeUndefined();
  });
});

describe("counts and kpis", () => {
  const rows = [
    row({ work_status: "failed" }),
    row(),
    row({ payment_status: "received", work_status: "running" }),
    row({ payment_status: "received", work_status: "completed" }),
    row({ payment_status: "received", work_status: "completed" }),
  ];
  it("counts every view and the total", () => {
    expect(viewCounts(rows)).toEqual({ all: 5, attention: 1, awaiting_payment: 1, in_analysis: 1, done: 2 });
  });
  it("offers the same views in a stable order", () => {
    expect(REQUEST_VIEWS.map((v) => v.id)).toEqual(["all", "attention", "awaiting_payment", "in_analysis", "done"]);
  });
  it("builds kpis from the loaded rows", () => {
    const kpis = requestKpis(rows);
    expect(kpis.find((k) => k.id === "attention")?.tone).toBe("danger");
    expect(kpis.find((k) => k.id === "done")?.value).toBe(2);
  });
  it("shows a quiet attention kpi when nothing needs attention", () => {
    expect(requestKpis([row({ payment_status: "received", work_status: "completed" })]).find((k) => k.id === "attention")?.tone).toBeUndefined();
  });
});

describe("requestTimeline", () => {
  it("walks a paid, running request", () => {
    const steps = requestTimeline(row({ payment_status: "received", work_status: "running" }), "23/10/2026 16:50");
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "done", "current"]);
    expect(steps[0].at).toBe("23/10/2026 16:50");
  });
  it("marks an unsupported file and a failed work as errors", () => {
    expect(requestTimeline(row({ admission_outcome: "unsupported" }), "x")[2].state).toBe("error");
    expect(requestTimeline(row({ payment_status: "received", work_status: "failed" }), "x")[4].state).toBe("error");
  });
  it("keeps untouched stages as todo", () => {
    const steps = requestTimeline(row({ admission_outcome: null }), "x");
    expect(steps[2].state).toBe("todo");
    expect(steps[3].state).toBe("todo");
    expect(steps[4].state).toBe("todo");
  });
});
