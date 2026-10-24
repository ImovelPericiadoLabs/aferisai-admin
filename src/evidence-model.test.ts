import { describe, expect, it } from "vitest";
import {
  declarationText,
  nextVersionId,
  sha256Hex,
  VERSION_ID_PATTERN,
} from "./evidence-model";

describe("sha256Hex", () => {
  it("matches the published SHA-256 test vectors", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(await sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes bytes the same way as the text they encode", async () => {
    const bytes = new TextEncoder().encode("abc");
    expect(await sha256Hex(bytes)).toBe(await sha256Hex("abc"));
  });

  it("always returns 64 lowercase hex characters", async () => {
    expect(await sha256Hex("çãõ — acentos")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("nextVersionId", () => {
  const oct = new Date("2026-10-24T15:00:00Z");

  it("increments the counter inside the same month", () => {
    expect(nextVersionId("direct-onr-2026-10-v2", [], oct)).toBe(
      "direct-onr-2026-10-v3",
    );
  });

  it("restarts at v1 when the month changed", () => {
    expect(nextVersionId("direct-onr-2026-09-v7", [], oct)).toBe(
      "direct-onr-2026-10-v1",
    );
  });

  it("uses the Brasília calendar, not UTC, to pick the month", () => {
    const lateNight = new Date("2026-11-01T01:30:00Z"); // 31 Oct 22:30 in São Paulo
    expect(nextVersionId("x-2026-10-v1", [], lateNight)).toBe("x-2026-10-v2");
  });

  it("skips numbers already used by other versions of the same month", () => {
    expect(
      nextVersionId(
        "direct-onr-2026-10-v2",
        ["direct-onr-2026-10-v3", "direct-onr-2026-10-v4"],
        oct,
      ),
    ).toBe("direct-onr-2026-10-v5");
  });

  it("never returns an id that already exists", () => {
    expect(nextVersionId("a-2026-09-v1", ["a-2026-10-v1"], oct)).toBe(
      "a-2026-10-v2",
    );
  });

  it("builds a valid id from a current version without the pattern", () => {
    const id = nextVersionId("legacy version!", [], oct);
    expect(id).toMatch(VERSION_ID_PATTERN);
    expect(id.endsWith("-2026-10-v1")).toBe(true);
  });

  it("falls back to a neutral prefix when there is no current version", () => {
    expect(nextVersionId("", [], oct)).toBe("commercial-2026-10-v1");
  });

  it("stays within 120 characters", () => {
    const id = nextVersionId(`${"a".repeat(150)}-2026-10-v1`, [], oct);
    expect(id.length).toBeLessThanOrEqual(120);
    expect(id).toMatch(VERSION_ID_PATTERN);
  });
});

describe("declarationText", () => {
  const input = {
    version: "direct-onr-2026-10-v3",
    previousVersion: "direct-onr-2026-10-v2",
    previousFeeCents: 99,
    nextFeeCents: 120,
    previousRateBps: 0,
    nextRateBps: 0,
    reason: "Tarifa PIX reajustada pelo provedor",
    generatedAt: "2026-10-24T15:00:00.000Z",
  };

  it("is deterministic and mentions what changed", () => {
    const text = declarationText(input);
    expect(text).toBe(declarationText(input));
    expect(text).toContain("direct-onr-2026-10-v3");
    expect(text).toContain("R$ 0,99");
    expect(text).toContain("R$ 1,20");
    expect(text).toContain("2026-10-24T15:00:00.000Z");
  });

  it("states it is a panel declaration, not a provider document", () => {
    expect(declarationText(input)).toMatch(/não é um documento do provedor/i);
  });

  it("changes the hash when any value changes", async () => {
    const a = await sha256Hex(declarationText(input));
    const b = await sha256Hex(declarationText({ ...input, nextFeeCents: 121 }));
    expect(a).not.toBe(b);
  });
});
