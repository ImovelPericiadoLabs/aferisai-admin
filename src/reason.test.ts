import { describe, expect, it } from "vitest";
import { changeReasonHeaders, validateReason } from "./reason";

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

describe("changeReasonHeaders", () => {
  it("sends nothing without a usable reason", () => {
    expect(changeReasonHeaders(undefined)).toEqual({});
    expect(changeReasonHeaders("   ")).toEqual({});
    expect(changeReasonHeaders("ab")).toEqual({});
  });
  it("sends the trimmed reason in X-Change-Reason", () => {
    expect(changeReasonHeaders("  Destino em manutenção  ")).toEqual({
      "X-Change-Reason": "Destino em manutenção",
    });
  });
  it("keeps header values valid: one line, typographic marks normalized, no characters outside Latin-1", () => {
    expect(changeReasonHeaders("linha 1\nlinha\t2")).toEqual({
      "X-Change-Reason": "linha 1 linha 2",
    });
    expect(changeReasonHeaders("“aspas” — reticências… ok")).toEqual({
      "X-Change-Reason": '"aspas" - reticencias... ok'.replace(
        "reticencias",
        "reticências",
      ),
    });
    expect(changeReasonHeaders("teste 😀 ok")["X-Change-Reason"]).toBe(
      "teste ? ok",
    );
  });
  it("cuts at the 500 character limit", () => {
    expect(
      changeReasonHeaders("x".repeat(600))["X-Change-Reason"],
    ).toHaveLength(500);
  });
});
