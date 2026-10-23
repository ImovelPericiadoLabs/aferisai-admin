import { describe, expect, it } from "vitest";
import {
  LOGO_RULE,
  SERVICE_ACCOUNT_RULE,
  describeFile,
  formatBytes,
  validateFile,
} from "./file-rules";

const MiB = 1024 * 1024;

describe("formatBytes", () => {
  it("formats bytes, KiB and MiB in pt-BR", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1 KiB");
    expect(formatBytes(1536)).toBe("1,5 KiB");
    expect(formatBytes(2 * MiB)).toBe("2 MiB");
  });
});

describe("describeFile", () => {
  it("detects the kind by MIME and lowercases the extension", () => {
    expect(
      describeFile({ name: "Logo.PNG", size: 10, type: "image/png" }),
    ).toMatchObject({ kind: "image", extension: "png" });
    expect(
      describeFile({ name: "a.pdf", size: 10, type: "application/pdf" }).kind,
    ).toBe("pdf");
    expect(
      describeFile({ name: "key.json", size: 10, type: "application/json" })
        .kind,
    ).toBe("json");
    expect(
      describeFile({ name: "notes.txt", size: 10, type: "text/plain" }).kind,
    ).toBe("text");
  });

  it("falls back to other for unknown types and to the extension for empty MIME", () => {
    expect(
      describeFile({
        name: "x.bin",
        size: 10,
        type: "application/octet-stream",
      }).kind,
    ).toBe("other");
    expect(
      describeFile({ name: "semextensao", size: 10, type: "" }),
    ).toMatchObject({ kind: "other", extension: "" });
    expect(describeFile({ name: "a.png", size: 10, type: "" }).kind).toBe(
      "image",
    );
  });

  it("includes a readable size label", () => {
    expect(
      describeFile({ name: "a.png", size: 1536, type: "image/png" }).sizeLabel,
    ).toBe("1,5 KiB");
  });
});

describe("validateFile with the logo rule", () => {
  it("accepts a PNG of exactly 2 MiB and rejects one byte more", () => {
    expect(
      validateFile(
        { name: "a.png", size: 2 * MiB, type: "image/png" },
        LOGO_RULE,
      ),
    ).toEqual({ ok: true });
    const over = validateFile(
      { name: "a.png", size: 2 * MiB + 1, type: "image/png" },
      LOGO_RULE,
    );
    expect(over).toMatchObject({ ok: false, code: "size" });
    if (!over.ok) expect(over.message).toContain("2 MiB");
  });

  it("rejects empty files and other types", () => {
    expect(
      validateFile({ name: "a.png", size: 0, type: "image/png" }, LOGO_RULE),
    ).toMatchObject({ ok: false, code: "empty" });
    expect(
      validateFile({ name: "a.gif", size: 10, type: "image/gif" }, LOGO_RULE),
    ).toMatchObject({ ok: false, code: "type" });
  });

  it("accepts an empty MIME when the extension is allowed, ignoring case", () => {
    expect(
      validateFile({ name: "a.JPG", size: 10, type: "" }, LOGO_RULE),
    ).toEqual({ ok: true });
  });
});

describe("validateFile with the service account rule", () => {
  it("enforces the 64 KiB limit at the boundary", () => {
    expect(
      validateFile(
        { name: "k.json", size: 64 * 1024, type: "application/json" },
        SERVICE_ACCOUNT_RULE,
      ),
    ).toEqual({ ok: true });
    const over = validateFile(
      { name: "k.json", size: 64 * 1024 + 1, type: "application/json" },
      SERVICE_ACCOUNT_RULE,
    );
    expect(over).toMatchObject({ ok: false, code: "size" });
    if (!over.ok) expect(over.message).toContain("64 KiB");
  });

  it("rejects non-json files", () => {
    expect(
      validateFile(
        { name: "a.txt", size: 10, type: "text/plain" },
        SERVICE_ACCOUNT_RULE,
      ),
    ).toMatchObject({ ok: false, code: "type" });
  });
});
