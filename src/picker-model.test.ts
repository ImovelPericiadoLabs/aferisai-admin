import { describe, expect, it } from "vitest";
import {
  filterOptions,
  mergeOptions,
  nextIndex,
  type PickerOption,
} from "./picker-model";

const options: PickerOption[] = [
  { id: "1", label: "Cartório Alfa", hint: "cartorio-alfa" },
  { id: "2", label: "Imobiliária Beta", hint: "imob-beta" },
  { id: "3", label: "Banco Gama" },
];

describe("filterOptions", () => {
  it("returns everything for an empty or blank query", () => {
    expect(filterOptions(options, "")).toHaveLength(3);
    expect(filterOptions(options, "   ")).toHaveLength(3);
  });

  it("ignores case and accents in the label", () => {
    expect(filterOptions(options, "CARTORIO").map((o) => o.id)).toEqual(["1"]);
    expect(filterOptions(options, "imobiliaria").map((o) => o.id)).toEqual([
      "2",
    ]);
  });

  it("also matches the hint", () => {
    expect(filterOptions(options, "imob-beta").map((o) => o.id)).toEqual(["2"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterOptions(options, "zzz")).toEqual([]);
  });
});

describe("mergeOptions", () => {
  it("keeps existing options and appends new ones without duplicating ids", () => {
    const merged = mergeOptions(options.slice(0, 2), [
      { id: "2", label: "Imobiliária Beta (novo rótulo)" },
      { id: "9", label: "Nova" },
    ]);
    expect(merged.map((o) => o.id)).toEqual(["1", "2", "9"]);
    expect(merged[1].label).toBe("Imobiliária Beta (novo rótulo)");
  });
});

describe("nextIndex", () => {
  it("wraps around in both directions", () => {
    expect(nextIndex(0, 1, 3)).toBe(1);
    expect(nextIndex(2, 1, 3)).toBe(0);
    expect(nextIndex(0, -1, 3)).toBe(2);
  });

  it("returns -1 for an empty list", () => {
    expect(nextIndex(0, 1, 0)).toBe(-1);
  });

  it("starts at the first or last item from no selection", () => {
    expect(nextIndex(-1, 1, 3)).toBe(0);
    expect(nextIndex(-1, -1, 3)).toBe(2);
  });
});
