import { describe, expect, it } from "vitest";
import { providerStatusTone } from "./status-tones";

describe("providerStatusTone", () => {
  it("maps each provider state to a badge tone", () => {
    expect(providerStatusTone("draft")).toBe("badge-neutral");
    expect(providerStatusTone("active")).toBe("badge-success");
    expect(providerStatusTone("suspended")).toBe("badge-warning");
  });
});
