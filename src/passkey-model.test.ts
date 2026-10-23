import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import {
  lastUsedLabel,
  passkeyErrorKind,
  passkeyUsage,
  revokeWarning,
} from "./passkey-model";

describe("passkeyUsage", () => {
  it("reports the count against the limit of five", () => {
    expect(passkeyUsage(2)).toEqual({
      count: 2,
      max: 5,
      full: false,
      label: "2 de 5 chaves",
    });
  });

  it("is full at the limit", () => {
    expect(passkeyUsage(5).full).toBe(true);
    expect(passkeyUsage(4).full).toBe(false);
  });
});

describe("passkeyErrorKind", () => {
  it("treats a dismissed device prompt as cancelled, not as an error", () => {
    expect(passkeyErrorKind({ name: "NotAllowedError" })).toBe("cancelled");
    expect(passkeyErrorKind({ name: "AbortError" })).toBe("cancelled");
  });

  it("flags an expired session", () => {
    expect(passkeyErrorKind(new ApiError(401, "X", "sessão"))).toBe(
      "unauthorized",
    );
  });

  it("falls back to failed", () => {
    expect(passkeyErrorKind(new Error("boom"))).toBe("failed");
    expect(passkeyErrorKind(new ApiError(500, "X", "erro"))).toBe("failed");
    expect(passkeyErrorKind(null)).toBe("failed");
  });
});

describe("revokeWarning", () => {
  it("warns about password-only access when it is the last key", () => {
    expect(revokeWarning(1)).toContain("senha");
  });

  it("does not mention password-only access when other keys remain", () => {
    expect(revokeWarning(2)).not.toContain("senha");
  });
});

describe("lastUsedLabel", () => {
  it("says never used for a null date", () => {
    expect(lastUsedLabel(null)).toBe("Nunca usada");
  });

  it("formats a real date", () => {
    const label = lastUsedLabel("2026-03-10T12:00:00Z");
    expect(label).not.toBe("Nunca usada");
    expect(label.length).toBeGreaterThan(5);
  });
});
