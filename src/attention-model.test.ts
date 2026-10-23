import { describe, expect, it } from "vitest";
import {
  ATTENTION_VIEWS,
  attentionKpis,
  attentionTone,
  attentionView,
  attentionViewCounts,
  type AttentionRow,
} from "./attention-model";

const row = (
  status: AttentionRow["status"],
  over: Partial<AttentionRow> = {},
): AttentionRow => ({
  work_id: "w-" + status,
  request_id: "r-" + status,
  status,
  error_code: status === "failed" ? "provider_error" : "",
  finished_at: "2026-10-23T10:00:00Z",
  ...over,
});

describe("attention views", () => {
  it("maps each backend status to a view", () => {
    expect(attentionView(row("failed"))).toBe("failed");
    expect(attentionView(row("unknown"))).toBe("uncertain");
    expect(attentionView(row("suspended"))).toBe("suspended");
    expect(attentionView(row("completed"))).toBe("completed");
  });
  it("keeps a stable order", () => {
    expect(ATTENTION_VIEWS.map((v) => v.id)).toEqual([
      "all",
      "failed",
      "uncertain",
      "suspended",
      "completed",
    ]);
  });
  it("counts each view", () => {
    const rows = [
      row("failed"),
      row("failed", { work_id: "x" }),
      row("unknown"),
      row("completed"),
    ];
    expect(attentionViewCounts(rows)).toEqual({
      all: 4,
      failed: 2,
      uncertain: 1,
      suspended: 0,
      completed: 1,
    });
  });
});

describe("attentionTone", () => {
  it("is danger for failures and uncertainty, warn for suspended, none when completed", () => {
    expect(attentionTone(row("failed"))).toBe("danger");
    expect(attentionTone(row("unknown"))).toBe("danger");
    expect(attentionTone(row("suspended"))).toBe("warn");
    expect(attentionTone(row("completed"))).toBeUndefined();
  });
});

describe("attentionKpis", () => {
  it("highlights failures and uncertain results", () => {
    const kpis = attentionKpis([row("failed"), row("unknown")]);
    expect(kpis.find((k) => k.id === "failed")?.tone).toBe("danger");
    expect(kpis.find((k) => k.id === "uncertain")?.value).toBe(1);
  });
  it("stays quiet with nothing to look at", () => {
    expect(
      attentionKpis([]).find((k) => k.id === "failed")?.tone,
    ).toBeUndefined();
  });
});
