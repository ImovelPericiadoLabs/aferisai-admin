import { describe, expect, it } from "vitest";
import { promotionTone, providerStatusTone, stageTone } from "./status-tones";

describe("providerStatusTone", () => {
  it("maps each provider state to a badge tone", () => {
    expect(providerStatusTone("draft")).toBe("badge-neutral");
    expect(providerStatusTone("active")).toBe("badge-success");
    expect(providerStatusTone("suspended")).toBe("badge-warning");
  });
});

describe("promotionTone and stageTone", () => {
  it("maps promotion states", () => {
    expect(promotionTone("active")).toBe("badge-success");
    expect(promotionTone("scheduled")).toBe("badge-info");
    expect(promotionTone("exhausted")).toBe("badge-warning");
    expect(promotionTone("expired")).toBe("badge-neutral");
    expect(promotionTone("suspended")).toBe("badge-warning");
  });
  it("maps case stages", () => {
    expect(stageTone("awaiting-proposal")).toBe("badge-neutral");
    expect(stageTone("awaiting-financial")).toBe("badge-info");
    expect(stageTone("executing")).toBe("badge-warning");
    expect(stageTone("done")).toBe("badge-success");
  });
});
