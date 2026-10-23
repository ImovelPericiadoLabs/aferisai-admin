import { describe, expect, it } from "vitest";
import { inSameRow, misalignment } from "./alignment-audit";

describe("inSameRow", () => {
  it("is true for side-by-side boxes even when one is much lower", () => {
    const input = { top: 51, bottom: 87, left: 0, right: 520 };
    const button = { top: 72, bottom: 108, left: 536, right: 700 };
    expect(inSameRow(input, button)).toBe(true);
  });

  it("is false for boxes stacked in different rows", () => {
    expect(
      inSameRow(
        { top: 0, bottom: 36, left: 0, right: 100 },
        { top: 44, bottom: 80, left: 120, right: 220 },
      ),
    ).toBe(false);
  });

  it("is false for stacked boxes that share the same horizontal span", () => {
    expect(
      inSameRow(
        { top: 0, bottom: 36, left: 0, right: 100 },
        { top: 30, bottom: 66, left: 10, right: 90 },
      ),
    ).toBe(false);
  });

  it("ignores a hairline of vertical overlap", () => {
    expect(
      inSameRow(
        { top: 0, bottom: 36, left: 0, right: 100 },
        { top: 35, bottom: 71, left: 120, right: 220 },
      ),
    ).toBe(false);
  });
});

describe("misalignment", () => {
  const row = { top: 0, bottom: 36 };

  it("accepts identical boxes and a one pixel difference", () => {
    expect(
      misalignment(row, { top: 0, bottom: 36 }, { checkHeight: true }),
    ).toBeNull();
    expect(
      misalignment(row, { top: 1, bottom: 37 }, { checkHeight: true }),
    ).toBeNull();
  });

  it("reports centers that do not line up", () => {
    const reason = misalignment(
      row,
      { top: 10, bottom: 46 },
      { checkHeight: true },
    );
    expect(reason).toContain("centros");
  });

  it("reports different heights when asked to, and ignores them otherwise", () => {
    const taller = { top: -3, bottom: 39 };
    expect(misalignment(row, taller, { checkHeight: true })).toContain(
      "alturas",
    );
    expect(misalignment(row, taller, { checkHeight: false })).toBeNull();
  });

  it("ignores boxes that are not in the same row", () => {
    expect(
      misalignment(row, { top: 44, bottom: 80 }, { checkHeight: true }),
    ).toBeNull();
  });
});
