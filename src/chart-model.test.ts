import { describe, expect, it } from "vitest";
import {
  areaPath,
  dayLabel,
  linePath,
  niceScale,
  pointsFor,
  shareBps,
} from "./chart-model";

describe("niceScale", () => {
  it("rounds the top up to a readable step and returns evenly spaced ticks", () => {
    expect(niceScale(0)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] });
    expect(niceScale(7)).toEqual({ max: 8, ticks: [0, 2, 4, 6, 8] });
    expect(niceScale(2300)).toEqual({
      max: 2400,
      ticks: [0, 600, 1200, 1800, 2400],
    });
    expect(niceScale(98_765_00)).toEqual({
      max: 10_000_000,
      ticks: [0, 2_500_000, 5_000_000, 7_500_000, 10_000_000],
    });
  });
  it("always covers the largest value", () => {
    for (const value of [1, 3, 99, 101, 1234, 56_789, 3_456_789])
      expect(niceScale(value).max).toBeGreaterThanOrEqual(value);
  });
});

describe("pointsFor and paths", () => {
  it("spreads points across the width and flips y so larger is higher", () => {
    const points = pointsFor([0, 5, 10], 200, 100, 10);
    expect(points).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
    ]);
  });
  it("puts a single point in the middle instead of dividing by zero", () => {
    expect(pointsFor([4], 200, 100, 8)).toEqual([{ x: 100, y: 50 }]);
  });
  it("builds a line and a closed area path", () => {
    const points = pointsFor([0, 10], 100, 100, 10);
    expect(linePath(points)).toBe("M0 100L100 0");
    expect(areaPath(points, 100)).toBe("M0 100L100 0L100 100L0 100Z");
    expect(linePath([])).toBe("");
  });
});

describe("helpers", () => {
  it("shares in basis points, safe for a zero total", () => {
    expect(shareBps(25, 100)).toBe(2500);
    expect(shareBps(1, 0)).toBe(0);
  });
  it("labels a day as dd/mm", () => {
    expect(dayLabel("2026-10-03")).toBe("03/10");
  });
});
