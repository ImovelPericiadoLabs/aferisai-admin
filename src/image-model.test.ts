import { describe, expect, it } from "vitest";
import { clampZoom, computeCrop, fitWithin } from "./image-model";

describe("clampZoom", () => {
  it("limits the zoom to 1-4", () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(9)).toBe(4);
    expect(clampZoom(2)).toBe(2);
  });
});

describe("computeCrop", () => {
  const at = (
    w: number,
    h: number,
    zoom: number,
    offsetX: number,
    offsetY: number,
  ) =>
    computeCrop({ naturalWidth: w, naturalHeight: h, zoom, offsetX, offsetY });

  it("uses the whole square at zoom 1", () => {
    expect(at(100, 100, 1, 0, 0)).toEqual({ sx: 0, sy: 0, size: 100 });
  });

  it("centers a landscape image and moves with the offset", () => {
    expect(at(200, 100, 1, 0, 0)).toEqual({ sx: 50, sy: 0, size: 100 });
    expect(at(200, 100, 1, -1, 0).sx).toBe(0);
    expect(at(200, 100, 1, 1, 0).sx).toBe(100);
  });

  it("zooms into the center and to the corner", () => {
    expect(at(100, 100, 2, 0, 0)).toEqual({ sx: 25, sy: 25, size: 50 });
    expect(at(100, 100, 2, 1, 1)).toEqual({ sx: 50, sy: 50, size: 50 });
  });

  it("clamps offsets and zoom", () => {
    expect(at(200, 100, 1, 5, 0).sx).toBe(100);
    expect(at(100, 100, 9, 0, 0).size).toBe(25);
  });

  it("never leaves the image bounds", () => {
    for (const [w, h] of [
      [100, 100],
      [200, 100],
      [100, 300],
    ])
      for (const zoom of [1, 2.5, 4])
        for (const ox of [-1, 0, 1])
          for (const oy of [-1, 0, 1]) {
            const crop = at(w, h, zoom, ox, oy);
            expect(crop.sx).toBeGreaterThanOrEqual(0);
            expect(crop.sy).toBeGreaterThanOrEqual(0);
            expect(crop.sx + crop.size).toBeLessThanOrEqual(w + 1e-9);
            expect(crop.sy + crop.size).toBeLessThanOrEqual(h + 1e-9);
          }
  });
});

describe("fitWithin", () => {
  it("shrinks keeping the aspect ratio", () => {
    expect(fitWithin(2000, 1000, 1024)).toEqual({ width: 1024, height: 512 });
    expect(fitWithin(1000, 3000, 1024)).toEqual({ width: 341, height: 1024 });
  });

  it("never enlarges", () => {
    expect(fitWithin(500, 500, 1024)).toEqual({ width: 500, height: 500 });
  });
});
