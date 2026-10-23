import { describe, expect, it } from "vitest";
import {
  suggestedSlug,
  validateApplication,
  validateCompany,
} from "./partner-onboarding-model";

describe("suggestedSlug", () => {
  it("removes accents, lowercases and joins words with hyphens", () => {
    expect(suggestedSlug("Cartório Central Ltda.")).toBe(
      "cartorio-central-ltda",
    );
    expect(suggestedSlug("  Açaí & Cia  ")).toBe("acai-cia");
  });
  it("caps at 120 characters without a trailing hyphen", () => {
    const slug = suggestedSlug(`${"a".repeat(119)} b`);
    expect(slug.length).toBeLessThanOrEqual(120);
    expect(slug.endsWith("-")).toBe(false);
  });
  it("is empty when nothing usable remains", () => {
    expect(suggestedSlug("!!!")).toBe("");
  });
});

describe("validateCompany", () => {
  it("accepts a name and a valid identifier", () => {
    expect(validateCompany("Cartório Central", "cartorio-central")).toEqual({});
  });
  it("requires the name up to 255 characters", () => {
    expect(validateCompany("  ", "ab").name).toBe(
      "Informe o nome da empresa (até 255 caracteres).",
    );
    expect(validateCompany("x".repeat(256), "ab").name).toBeDefined();
  });
  it("validates the identifier shape and size", () => {
    const message =
      "Use de 2 a 120 letras minúsculas, números ou hífens entre palavras.";
    expect(validateCompany("A", "a").slug).toBe(message);
    expect(validateCompany("A", "Ab").slug).toBe(message);
    expect(validateCompany("A", "-ab").slug).toBe(message);
    expect(validateCompany("A", "a--b").slug).toBe(message);
    expect(validateCompany("A", "a".repeat(121)).slug).toBe(message);
    expect(validateCompany("A", "a-b").slug).toBeUndefined();
  });
});

describe("validateApplication", () => {
  it("requires a name up to 255 characters", () => {
    expect(validateApplication("")).toEqual({
      application: "Informe o nome da primeira aplicação (até 255 caracteres).",
    });
    expect(validateApplication("x".repeat(256)).application).toBeDefined();
    expect(validateApplication("Integração")).toEqual({});
  });
});
