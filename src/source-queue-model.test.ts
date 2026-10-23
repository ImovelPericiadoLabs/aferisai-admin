import { describe, expect, it } from "vitest";
import {
  SOURCE_OPTIONS,
  expiryLabel,
  expiryTone,
  sourceKpis,
  type PendingSource,
} from "./source-queue-model";

const NOW = Date.parse("2026-10-23T12:00:00Z");
const H = 3_600_000;
const row = (expiresInH: number, id = "r1"): PendingSource => ({
  request_id: id,
  created_at: new Date(NOW - 5 * H).toISOString(),
  expires_at: new Date(NOW + expiresInH * H).toISOString(),
});

describe("expiryLabel", () => {
  it("counts down in the largest unit and flags the expired", () => {
    expect(expiryLabel(row(30).expires_at, NOW)).toBe("1 d");
    expect(expiryLabel(row(5).expires_at, NOW)).toBe("5 h");
    expect(expiryLabel(row(0.5).expires_at, NOW)).toBe("30 min");
    expect(expiryLabel(row(-2).expires_at, NOW)).toBe("vencido");
  });
});

describe("expiryTone", () => {
  it("turns urgent as the deadline approaches", () => {
    expect(expiryTone(row(72), NOW)).toBeUndefined();
    expect(expiryTone(row(20), NOW)).toBe("warn");
    expect(expiryTone(row(3), NOW)).toBe("danger");
    expect(expiryTone(row(-1), NOW)).toBe("danger");
  });
});

describe("sourceKpis", () => {
  it("shows the queue, the next to expire and the ones expiring within a day", () => {
    const kpis = sourceKpis([row(72, "a"), row(5, "b"), row(20, "c")], NOW);
    expect(kpis.find((k) => k.id === "all")?.value).toBe(3);
    expect(kpis.find((k) => k.id === "next")?.value).toBe("5 h");
    const soon = kpis.find((k) => k.id === "soon");
    expect(soon?.value).toBe(2);
    expect(soon?.tone).toBe("warning");
  });
  it("is calm when empty", () => {
    expect(sourceKpis([], NOW).find((k) => k.id === "next")?.value).toBe("—");
  });
});

describe("source options", () => {
  it("keeps 'could not verify' as the safe default and lists three natures", () => {
    expect(SOURCE_OPTIONS.map((o) => o.value)).toEqual([
      "unverified",
      "third_party_report",
      "registry_record",
    ]);
  });
});
