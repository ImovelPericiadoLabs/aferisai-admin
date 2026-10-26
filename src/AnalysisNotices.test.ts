import { describe, expect, it } from "vitest";
import { receiptReference } from "./notice-receipt";

describe("receiptReference", () => {
  it("stores only a stable digest of a complete SMTP Message-ID", async () => {
    const raw = "<6add6b1c.d52da948@mx.google.com>";
    const reference = await receiptReference(raw);
    expect(reference).toMatch(/^smtp\.sha256:[0-9a-f]{64}$/u);
    expect(reference).toBe(
      await receiptReference("6ADD6B1C.D52DA948@MX.GOOGLE.COM"),
    );
    expect(reference).not.toContain("mx.google.com");
  });

  it("rejects a missing or partial identifier", async () => {
    await expect(receiptReference("6add6b1c.d52da948")).rejects.toThrow(
      "Message-ID completo",
    );
    await expect(receiptReference("<one@example.com> extra")).rejects.toThrow(
      "Message-ID completo",
    );
  });
});
