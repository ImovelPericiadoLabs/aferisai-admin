import { describe, expect, it } from "vitest";
import { validateReason } from "./reason";

describe("validateReason", () => {
  it("rejects fewer than the minimum characters and names the minimum", () => {
    const result = validateReason("123456789", 10, 500);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("10");
  });

  it("accepts exactly the minimum", () => {
    expect(validateReason("1234567890", 10, 500)).toEqual({
      ok: true,
      length: 10,
      message: "",
    });
  });

  it("accepts exactly the maximum and rejects one over", () => {
    expect(validateReason("a".repeat(500), 10, 500).ok).toBe(true);
    const over = validateReason("a".repeat(501), 10, 500);
    expect(over.ok).toBe(false);
    expect(over.message).toContain("500");
  });

  it("rejects whitespace-only text", () => {
    const result = validateReason("   \n  ", 10, 500);
    expect(result.ok).toBe(false);
    expect(result.length).toBe(0);
  });

  it("counts after trimming", () => {
    const result = validateReason("  abcdefghij  ", 10, 500);
    expect(result.ok).toBe(true);
    expect(result.length).toBe(10);
  });
});
