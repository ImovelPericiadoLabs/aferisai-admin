import { describe, expect, it } from "vitest";

const stylesheets = import.meta.glob("./*.css", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Bottom alignment is intentional for titles beside actions and for charts.
// Controls that share a row with a labelled field must use `.field-action`
// (see docs/design-system/layout-rules.md), never `align-items: flex-end`.
const INTENTIONAL = [
  ".page-header",
  ".directory-head",
  ".organization-applications-heading",
  ".dash-series-heading",
  ".dash-section-heading",
  ".dash-report-heading",
  ".dash-card-trend-bars",
];

// Legacy forms to migrate to FieldAction when their screens are redesigned
// (wave 3 and dashboard filters). Do not add new entries.
const LEGACY_TO_MIGRATE = [
  ".dash-custom-range",
  ".integration-permission-review",
  ".integration-invitation form",
];

const ALLOWED_BOTTOM_ALIGNED = new Set([...INTENTIONAL, ...LEGACY_TO_MIGRATE]);

function bottomAlignedSelectors(css: string): string[] {
  const found: string[] = [];
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rule.exec(css))) {
    if (/align-items:\s*(flex-end|end)\b/.test(match[2]))
      for (const selector of match[1].split(",")) found.push(selector.trim());
  }
  return found;
}

describe("css layout guard", () => {
  it("does not bottom-align flex rows outside the allowlist", () => {
    const offenders: string[] = [];
    for (const [file, css] of Object.entries(stylesheets))
      for (const selector of bottomAlignedSelectors(css))
        if (!ALLOWED_BOTTOM_ALIGNED.has(selector))
          offenders.push(`${file}: ${selector}`);
    expect(
      offenders,
      "Use .field-action (FieldAction) para campo + botão na mesma linha; veja docs/design-system/layout-rules.md",
    ).toEqual([]);
  });

  it("detects the anti-pattern in a sample", () => {
    expect(
      bottomAlignedSelectors(".form { display: flex; align-items: flex-end; }"),
    ).toEqual([".form"]);
    expect(bottomAlignedSelectors(".ok { align-items: center; }")).toEqual([]);
  });
});
