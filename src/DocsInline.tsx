import { useDocs } from "./docs-context";
import { parseInline } from "./docs-model";

/** Renders the small inline markup used in documentation text: `code`, **bold** and links. */
export function Inline({ text }: { text: string }) {
  const { go } = useDocs();
  return (
    <>
      {parseInline(text).map((node, index) => {
        if (node.kind === "code") return <code key={index}>{node.text}</code>;
        if (node.kind === "bold")
          return <strong key={index}>{node.text}</strong>;
        if (node.kind === "link" && /^https?:\/\//.test(node.to))
          return (
            <a
              key={index}
              className="dx-link"
              href={node.to}
              target="_blank"
              rel="noreferrer noopener"
            >
              {node.text}
            </a>
          );
        if (node.kind === "link")
          return (
            <button
              key={index}
              type="button"
              className="dx-link"
              onClick={() => go(node.to)}
            >
              {node.text}
            </button>
          );
        return node.text;
      })}
    </>
  );
}
