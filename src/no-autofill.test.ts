import { describe, expect, it } from "vitest";
import { protectFromAutofill } from "./no-autofill";

function fake(tagName: string, type = "") {
  const attrs: Record<string, string> = {};
  return {
    tagName,
    type,
    attrs,
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
  };
}

describe("protectFromAutofill", () => {
  it("disables browser and password-manager autofill on text-like fields", () => {
    const input = fake("INPUT", "text");
    protectFromAutofill(input);
    expect(input.attrs).toMatchObject({
      autocomplete: "off",
      "data-lpignore": "true",
      "data-1p-ignore": "true",
      "data-bwignore": "true",
      "data-form-type": "other",
    });
  });

  it("covers email inputs, textareas and selects", () => {
    for (const el of [
      fake("INPUT", "email"),
      fake("TEXTAREA"),
      fake("SELECT"),
    ]) {
      protectFromAutofill(el);
      expect(el.attrs.autocomplete).toBe("off");
    }
  });

  it("uses new-password for password fields so saved credentials are never offered", () => {
    const input = fake("INPUT", "password");
    protectFromAutofill(input);
    expect(input.attrs.autocomplete).toBe("new-password");
  });

  it("turns autocomplete off on forms but adds no manager hints", () => {
    const form = fake("FORM");
    protectFromAutofill(form);
    expect(form.attrs).toEqual({ autocomplete: "off" });
  });

  it("leaves non-field elements untouched", () => {
    const div = fake("DIV");
    protectFromAutofill(div);
    expect(div.attrs).toEqual({});
  });

  it("skips buttons, checkboxes, radios and hidden inputs", () => {
    for (const type of ["button", "submit", "checkbox", "radio", "hidden"]) {
      const input = fake("INPUT", type);
      protectFromAutofill(input);
      expect(input.attrs).toEqual({});
    }
  });
});
