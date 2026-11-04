import { useId } from "react";
import { CodeBlock } from "./CodeBlock";
import { DocTabs } from "./DocTabs";
import { useDocs } from "./docs-context";
import { effectiveLanguage, SAMPLE_LANGUAGES } from "./docs-languages";
import type { CodeSample } from "./docs-model";

/**
 * One sample in several languages. The language is the reader's, shared by every sample on the site,
 * so choosing Python once switches all of them.
 */
export function DocsSamples({ sample }: { sample: CodeSample }) {
  const { language, setLanguage } = useDocs();
  const prefix = useId();
  const items = SAMPLE_LANGUAGES.filter((item) => sample.variants[item.id]);
  const current = effectiveLanguage(
    items.map((item) => item.id),
    language,
  );
  const meta = items.find((item) => item.id === current);
  if (!meta || !current) return null;
  return (
    <figure className="dx-samples">
      <figcaption className="dx-samples-head">
        <strong>{sample.title}</strong>
        <span>{sample.description}</span>
      </figcaption>
      <DocTabs
        label={`Linguagem: ${sample.title}`}
        items={items}
        value={current}
        onChange={setLanguage}
        idPrefix={`dx-${prefix.replace(/:/g, "")}`}
        size="sm"
      />
      <div
        role="tabpanel"
        id={`dx-${prefix.replace(/:/g, "")}-panel-${current}`}
        aria-labelledby={`dx-${prefix.replace(/:/g, "")}-tab-${current}`}
      >
        <CodeBlock
          language={meta.highlight}
          label={meta.label}
          code={sample.variants[current] ?? ""}
          maxHeight={520}
        />
      </div>
      {meta.requires && <p className="dx-samples-note">{meta.requires}</p>}
    </figure>
  );
}
