import { describe, expect, it } from "vitest";
import { summarizeServiceAccount, textPreview } from "./file-preview-model";

const account = JSON.stringify({
  type: "service_account",
  project_id: "meu-projeto",
  client_email: "robo@meu-projeto.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----ABC",
  private_key_id: "kid123",
});

describe("summarizeServiceAccount", () => {
  it("shows only type, project and account, in that order", () => {
    const result = summarizeServiceAccount(account);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fields.map((field) => field.label)).toEqual([
        "Tipo",
        "Projeto",
        "Conta",
      ]);
      expect(result.fields[1].value).toBe("meu-projeto");
    }
  });

  it("never exposes the private key or its id", () => {
    const result = summarizeServiceAccount(account);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("kid123");
  });

  it("keeps only the fields that are present strings", () => {
    const result = summarizeServiceAccount(
      JSON.stringify({ project_id: "p", type: 5 }),
    );
    expect(result.ok && result.fields).toEqual([
      { label: "Projeto", value: "p" },
    ]);
  });

  it("rejects invalid json, non-objects and unrelated objects with a message", () => {
    for (const bad of ["{", "[1,2]", "null", '{"foo":1}']) {
      const result = summarizeServiceAccount(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(5);
    }
  });
});

describe("textPreview", () => {
  it("cuts to 8 lines by default and flags truncation", () => {
    const text = Array.from({ length: 20 }, (_, i) => `linha ${i}`).join("\n");
    const result = textPreview(text);
    expect(result.text.split("\n")).toHaveLength(8);
    expect(result.truncated).toBe(true);
  });

  it("returns short text unchanged", () => {
    expect(textPreview("olá\nmundo")).toEqual({
      text: "olá\nmundo",
      truncated: false,
    });
  });

  it("cuts very long lines at 600 characters", () => {
    const result = textPreview("a".repeat(1000));
    expect(result.text).toHaveLength(600);
    expect(result.truncated).toBe(true);
  });
});
