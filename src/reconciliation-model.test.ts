import { describe, expect, it } from "vitest";
import {
  DECISIONS,
  decisionError,
  reconciliationKpis,
  reconciliationTone,
  type UncertainRow,
} from "./reconciliation-model";

const NOW = Date.parse("2026-10-23T12:00:00Z");
const H = 3_600_000;
const row = (hoursAgo: number, id = "i1"): UncertainRow => ({
  item_id: id,
  operation_id: "op-" + id,
  provider: "onr",
  created_at: new Date(NOW - (hoursAgo + 1) * H).toISOString(),
  attempted_at: new Date(NOW - hoursAgo * H).toISOString(),
});

describe("reconciliationTone", () => {
  it("escalates quickly because money may be at stake", () => {
    expect(reconciliationTone(row(1), NOW)).toBeUndefined();
    expect(reconciliationTone(row(7), NOW)).toBe("warn");
    expect(reconciliationTone(row(30), NOW)).toBe("danger");
  });
});

describe("reconciliationKpis", () => {
  it("counts pending, the oldest and those past a day", () => {
    const kpis = reconciliationKpis(
      [row(2, "a"), row(30, "b"), row(50, "c")],
      NOW,
    );
    expect(kpis.find((k) => k.id === "all")?.value).toBe(3);
    expect(kpis.find((k) => k.id === "oldest")?.value).toBe("2 d");
    const late = kpis.find((k) => k.id === "late");
    expect(late?.value).toBe(2);
    expect(late?.tone).toBe("danger");
  });
  it("is calm when the queue is empty", () => {
    const kpis = reconciliationKpis([], NOW);
    expect(kpis.find((k) => k.id === "oldest")?.value).toBe("—");
    expect(kpis.find((k) => k.id === "late")?.tone).toBeUndefined();
  });
});

describe("decisionError", () => {
  it("needs a protocol only when confirming one", () => {
    expect(decisionError("no_purchase", "")).toBeNull();
    expect(decisionError("protocol_confirmed", "  ")).toMatch(/protocolo/i);
    expect(decisionError("protocol_confirmed", "x".repeat(161))).toMatch(/160/);
    expect(decisionError("protocol_confirmed", "P26090880915D")).toBeNull();
  });
  it("offers the two backend decisions", () => {
    expect(DECISIONS.map((d) => d.value)).toEqual([
      "no_purchase",
      "protocol_confirmed",
    ]);
  });
});
