import { describe, expect, it } from "vitest";
import {
  REGISTRY_VIEWS,
  registryKpis,
  registryTimeline,
  registryTone,
  registryView,
  registryViewCounts,
  type RegistryRow,
} from "./registry-requests-model";

const row = (status: string, over: Partial<RegistryRow> = {}): RegistryRow => ({
  id: "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a0",
  owner_user_id: "u1",
  source: "number",
  product: "inteiro_teor",
  status,
  item_count: 2,
  created_at: "2026-10-23T16:50:00Z",
  ...over,
});

describe("registryView", () => {
  it("groups the backend statuses into four working views", () => {
    expect(registryView(row("pending"))).toBe("waiting");
    expect(registryView(row("awaiting_input"))).toBe("waiting");
    expect(registryView(row("dispatched"))).toBe("in_progress");
    expect(registryView(row("confirmed"))).toBe("done");
    for (const status of ["failed", "unknown", "unavailable"])
      expect(registryView(row(status))).toBe("attention");
  });
  it("sends an unknown status to attention instead of hiding it", () => {
    expect(registryView(row("algo-novo"))).toBe("attention");
  });
});

describe("registryTone", () => {
  it("is danger for failed or uncertain and warn for unavailable", () => {
    expect(registryTone(row("failed"))).toBe("danger");
    expect(registryTone(row("unknown"))).toBe("danger");
    expect(registryTone(row("unavailable"))).toBe("warn");
    expect(registryTone(row("confirmed"))).toBeUndefined();
  });
});

describe("counts and kpis", () => {
  const rows = [
    row("pending"),
    row("dispatched"),
    row("confirmed"),
    row("confirmed"),
    row("failed"),
  ];
  it("counts each view", () => {
    expect(registryViewCounts(rows)).toEqual({
      all: 5,
      attention: 1,
      waiting: 1,
      in_progress: 1,
      done: 2,
    });
  });
  it("keeps a stable order of views", () => {
    expect(REGISTRY_VIEWS.map((v) => v.id)).toEqual([
      "all",
      "attention",
      "waiting",
      "in_progress",
      "done",
    ]);
  });
  it("marks attention as danger only when there is something", () => {
    expect(registryKpis(rows).find((k) => k.id === "attention")?.tone).toBe(
      "danger",
    );
    expect(
      registryKpis([row("confirmed")]).find((k) => k.id === "attention")?.tone,
    ).toBeUndefined();
  });
});

describe("registryTimeline", () => {
  it("follows a dispatched request", () => {
    const steps = registryTimeline(row("dispatched"), "23/10 16:50");
    expect(steps.map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "todo",
    ]);
  });
  it("ends done when confirmed and in error when failed", () => {
    expect(registryTimeline(row("confirmed"), "x").map((s) => s.state)).toEqual(
      ["done", "done", "done", "done"],
    );
    expect(registryTimeline(row("failed"), "x")[2].state).toBe("error");
  });
  it("waits for input before dispatching", () => {
    expect(registryTimeline(row("awaiting_input"), "x")[1].state).toBe(
      "current",
    );
  });
});
