import { describe, expect, it } from "vitest";
import {
  filterOptions,
  mergeOptions,
  nextIndex,
  pagedResult,
  pickerKeyAction,
  shortId,
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

describe("pickerKeyAction", () => {
  const base = {
    open: true,
    hasActive: true,
    queryEmpty: true,
    multiple: false,
    hasValue: false,
  };

  it("always swallows Enter while open so the surrounding form is not submitted", () => {
    expect(pickerKeyAction("Enter", base)).toBe("choose");
    expect(pickerKeyAction("Enter", { ...base, hasActive: false })).toBe(
      "swallow",
    );
  });

  it("does not touch Enter when the list is closed", () => {
    expect(pickerKeyAction("Enter", { ...base, open: false })).toBe("none");
  });

  it("opens on arrows when closed and moves when open", () => {
    expect(pickerKeyAction("ArrowDown", { ...base, open: false })).toBe("open");
    expect(pickerKeyAction("ArrowDown", base)).toBe("next");
    expect(pickerKeyAction("ArrowUp", base)).toBe("prev");
  });

  it("closes on Escape only while open", () => {
    expect(pickerKeyAction("Escape", base)).toBe("close");
    expect(pickerKeyAction("Escape", { ...base, open: false })).toBe("none");
  });

  it("removes the last chip on Backspace only in multi mode with an empty query", () => {
    expect(
      pickerKeyAction("Backspace", { ...base, multiple: true, hasValue: true }),
    ).toBe("removeLast");
    expect(
      pickerKeyAction("Backspace", {
        ...base,
        multiple: true,
        hasValue: true,
        queryEmpty: false,
      }),
    ).toBe("none");
    expect(pickerKeyAction("Backspace", { ...base, hasValue: true })).toBe(
      "none",
    );
  });
});

describe("pagedResult", () => {
  type Row = { id: string; name: string };
  const pages: Record<string, { items: Row[]; next_cursor: string | null }> = {
    first: {
      items: [
        { id: "1", name: "Alfa" },
        { id: "2", name: "Beta" },
      ],
      next_cursor: "p2",
    },
    p2: { items: [{ id: "3", name: "Gama" }], next_cursor: null },
  };
  const fetchPage = (cursor?: string) =>
    Promise.resolve(pages[cursor ?? "first"]);
  const toOption = (row: Row): PickerOption => ({
    id: row.id,
    label: row.name,
  });

  it("returns the first page and a next loader while a cursor exists", async () => {
    const result = await pagedResult(fetchPage, toOption, "", false);
    expect(result.options.map((o) => o.id)).toEqual(["1", "2"]);
    expect(result.next).toBeTypeOf("function");
  });

  it("loads the following page through next and stops at the last one", async () => {
    const first = await pagedResult(fetchPage, toOption, "", false);
    const second = await first.next!();
    expect(second.options.map((o) => o.id)).toEqual(["3"]);
    expect(second.next).toBeUndefined();
  });

  it("filters each page on the client when asked, keeping the loader", async () => {
    const result = await pagedResult(fetchPage, toOption, "gama", true);
    expect(result.options).toEqual([]);
    expect(result.next).toBeTypeOf("function");
    const second = await result.next!();
    expect(second.options.map((o) => o.id)).toEqual(["3"]);
  });

  it("drops rows the mapper rejects", async () => {
    const result = await pagedResult(
      fetchPage,
      (row) => (row.id === "2" ? null : toOption(row)),
      "",
      false,
    );
    expect(result.options.map((o) => o.id)).toEqual(["1"]);
  });
});

describe("shortId", () => {
  it("shortens long ids and keeps short ones", () => {
    expect(shortId("0198a1b2-aaaa-bbbb-cccc")).toBe("0198a1b2…");
    expect(shortId("abc")).toBe("abc");
  });
});
