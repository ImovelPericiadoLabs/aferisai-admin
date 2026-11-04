import { CodeBlock } from "./CodeBlock";
import { useDocs } from "./docs-context";
import { slugify, type Block, type CodeSample } from "./docs-model";
import { Inline } from "./DocsInline";
import { DocsSamples } from "./DocsSamples";

const CALLOUT_LABEL = {
  note: "Observação",
  tip: "Dica",
  warning: "Atenção",
  danger: "Importante",
} as const;

function CalloutIcon({ tone }: { tone: keyof typeof CALLOUT_LABEL }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (tone === "tip")
    return (
      <svg {...common}>
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
      </svg>
    );
  if (tone === "warning")
    return (
      <svg {...common}>
        <path d="M12 3 2.5 20h19L12 3ZM12 10v4.5M12 17.5v.01" />
      </svg>
    );
  if (tone === "danger")
    return (
      <svg {...common}>
        <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5ZM12 8v5M12 16.5v.01" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </svg>
  );
}

export function DocsBlock({
  block,
  samples,
  pageId,
}: {
  block: Block;
  samples: Record<string, CodeSample>;
  pageId: string;
}) {
  const { go } = useDocs();
  switch (block.type) {
    case "p":
      return (
        <p className="dx-p">
          <Inline text={block.text} />
        </p>
      );
    case "h3":
      return (
        <h3
          id={`dx-${pageId}-${slugify(block.text)}`}
          data-anchor={slugify(block.text)}
          className="dx-h3"
        >
          {block.text}
        </h3>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className="dx-list">
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "steps":
      return (
        <ol className="dx-steps">
          {block.items.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>
                <Inline text={item.text} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <aside className="dx-callout" data-tone={block.tone} role="note">
          <strong>
            <CalloutIcon tone={block.tone} />
            {block.title ?? CALLOUT_LABEL[block.tone]}
          </strong>
          <p>
            <Inline text={block.text} />
          </p>
        </aside>
      );
    case "code":
      return (
        <CodeBlock
          language={block.language}
          label={block.label}
          code={block.code}
        />
      );
    case "samples": {
      const sample = samples[block.id];
      return sample ? <DocsSamples sample={sample} /> : null;
    }
    case "table":
      return (
        <div className="data-table-wrap dx-table-wrap">
          <table className="data-table dx-table">
            <caption className="sr-only">{block.caption}</caption>
            <thead>
              <tr>
                {block.columns.map((column) => (
                  <th key={column} scope="col">
                    <Inline text={column} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      data-label={block.columns[cellIndex].replace(/`/g, "")}
                    >
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "links":
      return (
        <ul className="dx-tiles">
          {block.items.map((item) => (
            <li key={item.to}>
              <button type="button" onClick={() => go(item.to)}>
                <strong>{item.title}</strong>
                <span>
                  <Inline text={item.text} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      );
  }
}
