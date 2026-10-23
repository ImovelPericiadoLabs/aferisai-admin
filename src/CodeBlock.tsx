import { useMemo, useState } from "react";
import { highlight, type CodeLanguage } from "./code-highlight";
import "./code-block.css";

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  json: "JSON",
  js: "Node.js",
  python: "Python",
  shell: "cURL",
  http: "Cabeçalhos",
};

/**
 * Read-only code with syntax colours. The text is rendered as-is (copying copies the
 * source) and the block scrolls sideways instead of breaking identifiers.
 */
export function CodeBlock({
  code,
  language,
  label,
  copyLabel = "Copiar",
  maxHeight = 420,
}: {
  code: string;
  language: CodeLanguage;
  label?: string;
  copyLabel?: string;
  maxHeight?: number;
}) {
  const tokens = useMemo(() => highlight(code, language), [code, language]);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const title = label ?? LANGUAGE_LABELS[language];

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 1600);
  }

  return (
    <figure className="cb">
      <figcaption className="cb-bar">
        <span className="cb-title">{title}</span>
        <button type="button" className="cb-copy" onClick={() => void copy()}>
          {copied === "done"
            ? "Copiado"
            : copied === "failed"
              ? "Não foi possível copiar"
              : copyLabel}
        </button>
        <span className="sr-only" role="status">
          {copied === "done" ? "Copiado para a área de transferência" : ""}
        </span>
      </figcaption>
      <pre
        className="cb-pre"
        tabIndex={0}
        aria-label={`Código ${title}`}
        style={{ maxHeight }}
      >
        <code>
          {tokens.map((token, index) =>
            token.kind === "plain" ? (
              token.text
            ) : (
              <span key={index} className={`cb-${token.kind}`}>
                {token.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </figure>
  );
}
