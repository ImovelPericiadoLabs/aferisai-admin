import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "./CodeBlock";

describe("CodeBlock", () => {
  it("renders coloured spans and keeps every character of the source", () => {
    const html = renderToStaticMarkup(
      <CodeBlock language="json" code={'{"id": "x", "n": 1}'} />,
    );
    expect(html).toContain('class="cb-key"');
    expect(html).toContain('class="cb-string"');
    expect(html).toContain('class="cb-number"');
    const text = html.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"');
    expect(text).toContain('{"id": "x", "n": 1}');
  });
  it("is keyboard reachable, labelled and has a copy button", () => {
    const html = renderToStaticMarkup(
      <CodeBlock
        language="shell"
        code="curl -X POST 'a'"
        copyLabel="Copiar comando"
      />,
    );
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Código cURL"');
    expect(html).toContain("Copiar comando");
  });
  it("escapes markup in the code instead of injecting it", () => {
    const html = renderToStaticMarkup(
      <CodeBlock language="js" code={'x = "<img src=x onerror=alert(1)>"'} />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
