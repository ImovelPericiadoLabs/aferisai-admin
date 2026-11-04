import { describe, expect, it } from "vitest";
import {
  effectiveLanguage,
  isSampleLanguage,
  SAMPLE_LANGUAGES,
} from "./docs-languages";

describe("effectiveLanguage", () => {
  it("keeps the preferred language when the sample has it", () => {
    expect(effectiveLanguage(["curl", "node", "go"], "go")).toBe("go");
  });
  it("falls back to the first language, in tab order, that the sample has", () => {
    expect(effectiveLanguage(["python", "node"], "curl")).toBe("node");
  });
  it("returns null when the sample has no variants", () => {
    expect(effectiveLanguage([], "node")).toBeNull();
  });
});

describe("isSampleLanguage", () => {
  it("accepts the known ids only", () => {
    expect(isSampleLanguage("csharp")).toBe(true);
    expect(isSampleLanguage("php")).toBe(false);
    expect(isSampleLanguage(null)).toBe(false);
  });
  it("lists each language once", () => {
    const ids = SAMPLE_LANGUAGES.map((language) => language.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
