import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPromotionPolicies } from "./lookups";

afterEach(() => vi.unstubAllGlobals());

describe("promotion policy lookup", () => {
  it("requests only published promotion policies from the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await searchPromotionPolicies("");

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/v1/team/commercial-policies");
    expect(url.searchParams.get("channel")).toBe("promotion");
    expect(url.searchParams.get("status")).toBe("published");
  });
});
