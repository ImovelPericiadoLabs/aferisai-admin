import { describe, expect, it, vi } from "vitest";
import { createLogoLoader } from "./logo-loader";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe("createLogoLoader", () => {
  it("uses the known logo path without asking for the detail", async () => {
    const detail = vi.fn();
    const blob = vi.fn(async (path: string) => `blob:${path}`);
    const load = createLogoLoader({ detail, blob, concurrency: 2 });
    expect(await load("o1", "/v1/x/logo")).toBe("blob:/v1/x/logo");
    expect(detail).not.toHaveBeenCalled();
  });
  it("returns null without a request when the list says there is no logo", async () => {
    const detail = vi.fn();
    const blob = vi.fn();
    const load = createLogoLoader({ detail, blob, concurrency: 2 });
    expect(await load("o1", null)).toBeNull();
    expect(detail).not.toHaveBeenCalled();
    expect(blob).not.toHaveBeenCalled();
  });
  it("falls back to the detail when the list does not tell", async () => {
    const detail = vi.fn(async () => "/v1/team/organizations/o1/logo");
    const blob = vi.fn(async (path: string) => `blob:${path}`);
    const load = createLogoLoader({ detail, blob, concurrency: 2 });
    expect(await load("o1", undefined)).toBe(
      "blob:/v1/team/organizations/o1/logo",
    );
    expect(detail).toHaveBeenCalledWith("o1");
  });
  it("caches per organization, including the absence of a logo", async () => {
    const detail = vi.fn(async () => null);
    const blob = vi.fn();
    const load = createLogoLoader({ detail, blob, concurrency: 2 });
    await load("o1", undefined);
    await load("o1", undefined);
    expect(detail).toHaveBeenCalledTimes(1);
  });
  it("shares one request between simultaneous callers", async () => {
    const gate = deferred<string | null>();
    const detail = vi.fn(() => gate.promise);
    const load = createLogoLoader({ detail, blob: vi.fn(), concurrency: 2 });
    const a = load("o1", undefined);
    const b = load("o1", undefined);
    gate.resolve(null);
    await Promise.all([a, b]);
    expect(detail).toHaveBeenCalledTimes(1);
  });
  it("limits how many requests run at once", async () => {
    let running = 0;
    let peak = 0;
    const detail = vi.fn(async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1;
      return null;
    });
    const load = createLogoLoader({ detail, blob: vi.fn(), concurrency: 2 });
    await Promise.all(
      ["a", "b", "c", "d", "e"].map((id) => load(id, undefined)),
    );
    expect(peak).toBeLessThanOrEqual(2);
    expect(detail).toHaveBeenCalledTimes(5);
  });
  it("gives up quietly on failures and can be invalidated", async () => {
    const detail = vi
      .fn<(id: string) => Promise<string | null>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("/logo");
    const blob = vi.fn(async (p: string) => `blob:${p}`);
    const load = createLogoLoader({ detail, blob, concurrency: 1 });
    expect(await load("o1", undefined)).toBeNull();
    load.invalidate("o1");
    expect(await load("o1", undefined)).toBe("blob:/logo");
  });
});
