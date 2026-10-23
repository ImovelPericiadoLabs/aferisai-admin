import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveRequestId } from "./original-lookup";

afterEach(() => vi.unstubAllGlobals());

describe("resolveRequestId", () => {
  it("uses the request id the case already carries, without any call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      resolveRequestId({ workId: "w1", requestId: "r1" }),
    ).resolves.toEqual({ ok: true, requestId: "r1" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the review packet of the work", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ work_id: "w1", request_id: "r9" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      resolveRequestId({ workId: "w1", requestId: null }),
    ).resolves.toEqual({ ok: true, requestId: "r9" });
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/v1/team/analysis-works/w1/review");
  });

  it("explains when the work has no review packet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { code: "analysis.review_not_ready", detail: "não pronto" },
          { status: 409 },
        ),
      ),
    );
    const result = await resolveRequestId({ workId: "w1", requestId: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.unauthorized).toBe(false);
      expect(result.message).toMatch(/não foi possível localizar/i);
    }
  });

  it("flags an expired session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ code: "x", detail: "no" }, { status: 401 }),
      ),
    );
    const result = await resolveRequestId({ workId: "w1", requestId: null });
    expect(result).toMatchObject({ ok: false, unauthorized: true });
  });
});
