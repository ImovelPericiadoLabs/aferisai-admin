/**
 * Small dependency-free syntax highlighter for the code the admin shows (JSON bodies,
 * Node.js and Python snippets, cURL commands and HTTP headers). It is a lexer, not a
 * parser: it never changes the text, so copying the rendered block copies the source.
 */
export type CodeLanguage = "json" | "js" | "python" | "shell" | "http";
export type TokenKind =
  | "plain"
  | "punct"
  | "key"
  | "string"
  | "number"
  | "keyword"
  | "function"
  | "comment"
  | "flag";
export type Token = { kind: TokenKind; text: string };

type Rule = { kind: TokenKind; pattern: RegExp };

const sticky = (source: string) => new RegExp(source, "y");

const NUMBER = String.raw`-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b`;

const JSON_RULES: Rule[] = [
  { kind: "string", pattern: sticky(String.raw`"(?:[^"\\\n]|\\.)*"?`) },
  { kind: "number", pattern: sticky(NUMBER) },
  { kind: "keyword", pattern: sticky(String.raw`\b(?:true|false|null)\b`) },
  { kind: "punct", pattern: sticky(String.raw`[{}\[\],:]`) },
];

const JS_KEYWORDS =
  "import|export|from|function|const|let|var|return|if|else|new|await|async|class|of|in|true|false|null|undefined|typeof|throw|try|catch|for|while";
const JS_RULES: Rule[] = [
  {
    kind: "comment",
    pattern: sticky(String.raw`//[^\n]*|/\*[\s\S]*?(?:\*/|$)`),
  },
  {
    kind: "string",
    pattern: sticky(
      String.raw`"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|` +
        "`(?:[^`\\\\]|\\\\.)*`?",
    ),
  },
  { kind: "number", pattern: sticky(String.raw`\b\d+(?:\.\d+)?\b`) },
  { kind: "keyword", pattern: sticky(String.raw`\b(?:${JS_KEYWORDS})\b`) },
  { kind: "function", pattern: sticky(String.raw`[A-Za-z_$][\w$]*(?=\()`) },
  { kind: "plain", pattern: sticky(String.raw`[A-Za-z_$][\w$]*`) },
  { kind: "punct", pattern: sticky(String.raw`[{}()\[\];,.:=<>+\-*/&|!?]`) },
];

const PY_KEYWORDS =
  "def|return|import|from|class|if|elif|else|for|while|in|not|and|or|is|None|True|False|as|with|try|except|raise|lambda|pass";
const PY_RULES: Rule[] = [
  { kind: "comment", pattern: sticky(String.raw`#[^\n]*`) },
  {
    kind: "string",
    pattern: sticky(
      String.raw`[bBrRfF]{0,2}(?:"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)`,
    ),
  },
  { kind: "number", pattern: sticky(String.raw`\b\d+(?:\.\d+)?\b`) },
  { kind: "keyword", pattern: sticky(String.raw`\b(?:${PY_KEYWORDS})\b`) },
  {
    kind: "function",
    pattern: sticky(String.raw`(?<=\bdef\s+)[A-Za-z_]\w*|[A-Za-z_]\w*(?=\()`),
  },
  { kind: "plain", pattern: sticky(String.raw`[A-Za-z_]\w*`) },
  { kind: "punct", pattern: sticky(String.raw`[{}()\[\];,.:=<>+\-*/&|!?]`) },
];

const SHELL_RULES: Rule[] = [
  { kind: "comment", pattern: sticky(String.raw`#[^\n]*`) },
  {
    kind: "string",
    pattern: sticky(
      String.raw`'[^']*'(?:\\''[^']*')*|'[^']*$|"(?:[^"\\]|\\.)*"?`,
    ),
  },
  { kind: "flag", pattern: sticky(String.raw`(?<![\w-])--?[A-Za-z][\w-]*`) },
  { kind: "function", pattern: sticky(String.raw`(?<![\w-])curl(?![\w-])`) },
  { kind: "punct", pattern: sticky(String.raw`\\`) },
];

const RULES: Partial<Record<CodeLanguage, Rule[]>> = {
  json: JSON_RULES,
  js: JS_RULES,
  python: PY_RULES,
  shell: SHELL_RULES,
};

function push(tokens: Token[], kind: TokenKind, text: string) {
  if (!text) return;
  const last = tokens.at(-1);
  if (last && last.kind === kind && (kind === "plain" || kind === "punct"))
    last.text += text;
  else tokens.push({ kind, text });
}

function lex(code: string, rules: Rule[], json: boolean): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < code.length) {
    let matched = false;
    for (const rule of rules) {
      rule.pattern.lastIndex = index;
      const match = rule.pattern.exec(code);
      if (!match || match[0] === "") continue;
      let kind = rule.kind;
      // In JSON a string followed by a colon is an object key.
      if (
        json &&
        kind === "string" &&
        /^\s*:/.test(code.slice(index + match[0].length))
      )
        kind = "key";
      push(tokens, kind, match[0]);
      index += match[0].length;
      matched = true;
      break;
    }
    if (!matched) {
      push(tokens, "plain", code[index]);
      index += 1;
    }
  }
  return tokens;
}

const REQUEST_LINE = /^(GET|POST|PUT|PATCH|DELETE)( +)(\S+)(.*)$/;
const HEADER_LINE = /^([A-Za-z][\w-]*)(:)(.*)$/;

function lexHttp(code: string): Token[] {
  const tokens: Token[] = [];
  code.split("\n").forEach((line, index, all) => {
    const request = REQUEST_LINE.exec(line);
    const header = HEADER_LINE.exec(line);
    if (request) {
      push(tokens, "keyword", request[1]);
      push(tokens, "plain", request[2]);
      push(tokens, "string", request[3]);
      push(tokens, "plain", request[4]);
    } else if (header) {
      push(tokens, "key", header[1]);
      push(tokens, "punct", header[2]);
      push(tokens, "plain", header[3]);
    } else push(tokens, "plain", line);
    if (index < all.length - 1) push(tokens, "plain", "\n");
  });
  return tokens;
}

export function highlight(code: string, language: CodeLanguage): Token[] {
  if (language === "http") return lexHttp(code);
  return lex(code, RULES[language] ?? [], language === "json");
}
