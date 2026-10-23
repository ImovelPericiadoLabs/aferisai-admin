import { describe, expect, it } from "vitest";
import { highlight, type CodeLanguage } from "./code-highlight";

const join = (code: string, lang: CodeLanguage) =>
  highlight(code, lang)
    .map((token) => token.text)
    .join("");
const kinds = (code: string, lang: CodeLanguage) =>
  highlight(code, lang)
    .filter((t) => t.kind !== "plain" && t.kind !== "punct")
    .map((t) => [t.kind, t.text]);

describe("highlight keeps the text intact", () => {
  const samples: [CodeLanguage, string][] = [
    ["json", '{\n  "a": [1, 2.5, -3e2, true, null],\n  "b": {"c": "d\\"e"}\n}'],
    ["js", 'import { x } from "node:crypto";\n// nota\nconst a = f(1, `t`);'],
    [
      "python",
      'import hmac\n# nota\ndef f(a: bytes) -> bool:\n    return a == b"x"',
    ],
    [
      "shell",
      "curl -X POST 'https://x.test/a' \\\n  -H 'A: b' \\\n  --data-raw '{\"m\":\"it'\\''s\"}'",
    ],
    [
      "http",
      "POST /webhooks/aferis HTTP/1.1\nContent-Type: application/json\nX-Aferis-Signature: sha256=ab",
    ],
  ];
  for (const [lang, code] of samples)
    it(`${lang}: concatenating the tokens gives back the source`, () => {
      expect(join(code, lang)).toBe(code);
    });
  it("handles empty and unterminated input without throwing", () => {
    expect(join("", "json")).toBe("");
    expect(join('{"a": "aberta', "json")).toBe('{"a": "aberta');
    expect(join("'aberta", "shell")).toBe("'aberta");
  });
});

describe("text", () => {
  it("is shown as written: no token is coloured", () => {
    const code = 'linha com "aspas", 123 e {chaves}\n// não é comentário';
    expect(join(code, "text")).toBe(code);
    expect(kinds(code, "text")).toEqual([]);
  });
});

describe("json", () => {
  it("tells keys from string values and marks numbers and literals", () => {
    expect(
      kinds('{"id": "x", "n": 1.5, "ok": true, "v": null}', "json"),
    ).toEqual([
      ["key", '"id"'],
      ["string", '"x"'],
      ["key", '"n"'],
      ["number", "1.5"],
      ["key", '"ok"'],
      ["keyword", "true"],
      ["key", '"v"'],
      ["keyword", "null"],
    ]);
  });
  it("keeps escaped quotes inside the string and strings containing colons as values", () => {
    expect(kinds('{"k": "a\\"b: c"}', "json")).toEqual([
      ["key", '"k"'],
      ["string", '"a\\"b: c"'],
    ]);
  });
});

describe("js", () => {
  it("marks keywords, comments, strings, numbers and called functions", () => {
    expect(kinds('const a = f(1); // fim\nreturn "s";', "js")).toEqual([
      ["keyword", "const"],
      ["function", "f"],
      ["number", "1"],
      ["comment", "// fim"],
      ["keyword", "return"],
      ["string", '"s"'],
    ]);
  });
});

describe("python", () => {
  it("marks keywords, the function being defined, comments and literals", () => {
    expect(kinds("def ok(a):  # nota\n    return None", "python")).toEqual([
      ["keyword", "def"],
      ["function", "ok"],
      ["comment", "# nota"],
      ["keyword", "return"],
      ["keyword", "None"],
    ]);
  });
});

describe("shell", () => {
  it("marks the command, flags and quoted arguments", () => {
    expect(
      kinds("curl -X POST 'https://x.test' --data-raw 'a'", "shell"),
    ).toEqual([
      ["function", "curl"],
      ["flag", "-X"],
      ["string", "'https://x.test'"],
      ["flag", "--data-raw"],
      ["string", "'a'"],
    ]);
  });
  it("keeps the '\\'' escape inside one argument", () => {
    const strings = kinds("--data-raw '{\"m\":\"it'\\''s\"}'", "shell").filter(
      ([k]) => k === "string",
    );
    expect(strings.map(([, text]) => text).join("")).toContain("it'\\''s");
  });
});

describe("http", () => {
  it("marks the request line, header names and leaves values plain", () => {
    expect(
      kinds("POST /w HTTP/1.1\nContent-Type: application/json", "http"),
    ).toEqual([
      ["keyword", "POST"],
      ["string", "/w"],
      ["key", "Content-Type"],
    ]);
  });
});
