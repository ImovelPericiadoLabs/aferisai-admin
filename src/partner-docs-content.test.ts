import { describe, expect, it } from "vitest";
import { searchDocs, validateSite, type Block } from "./docs-model";
import { partnerDocs } from "./partner-docs-content";

const blocks = partnerDocs.pages.flatMap((page) =>
  page.sections.flatMap((section) => section.blocks),
);
const ofType = <T extends Block["type"]>(type: T) =>
  blocks.filter(
    (block): block is Extract<Block, { type: T }> => block.type === type,
  );

describe("partner documentation content", () => {
  it("has no dead links, duplicate anchors or missing samples", () => {
    expect(validateSite(partnerDocs)).toEqual([]);
  });

  it("keeps every topic of the previous documentation", () => {
    expect(partnerDocs.pages.map((page) => page.id)).toEqual(
      expect.arrayContaining([
        "comece-aqui",
        "organizacao-e-sessao",
        "aplicacoes",
        "credenciais",
        "oauth",
        "acessos",
        "webhooks",
        "entregas",
        "ordens",
        "metricas",
        "extrato",
        "pessoas",
        "permissoes",
        "seguranca",
      ]),
    );
  });

  it("gives every page a summary and at least one section with content", () => {
    for (const page of partnerDocs.pages) {
      expect(page.summary, page.id).not.toBe("");
      expect(page.sections.length, page.id).toBeGreaterThan(0);
      for (const section of page.sections)
        expect(
          section.blocks.length,
          `${page.id}#${section.id}`,
        ).toBeGreaterThan(0);
    }
  });

  it("builds tables whose rows match their columns", () => {
    for (const table of ofType("table"))
      for (const row of table.rows)
        expect(row.length, `${table.caption}: ${row[0]}`).toBe(
          table.columns.length,
        );
  });

  it("documents the 19 delegated scopes the backend defines", () => {
    const scopes = ofType("table").find(
      (table) => table.caption === "Escopos delegados",
    );
    expect(scopes?.rows.length).toBe(19);
    expect(scopes?.rows.map((row) => row[0])).toContain("`registry:submit`");
  });

  it("ships every sample in the five programming languages, and the HTTP ones in cURL too", () => {
    for (const [id, sample] of Object.entries(partnerDocs.samples)) {
      for (const lang of ["node", "python", "java", "csharp", "go"] as const)
        expect(sample.variants[lang], `${id} ${lang}`).toBeTruthy();
      if (id !== "verify-webhook")
        expect(sample.variants.curl, `${id} curl`).toBeTruthy();
    }
  });

  it("does not leave unfinished markers in the samples", () => {
    for (const [id, sample] of Object.entries(partnerDocs.samples))
      for (const [lang, code] of Object.entries(sample.variants))
        expect(code, `${id} ${lang}`).not.toMatch(/TODO|FIXME|XXX/);
  });

  it("can be found by the words a developer would type", () => {
    expect(searchDocs(partnerDocs, "pkce")[0].pageId).toBe("oauth");
    expect(
      searchDocs(partnerDocs, "idempotency").map((h) => h.pageId),
    ).toContain("ordens");
    expect(
      searchDocs(partnerDocs, "escopo registry:submit").map((h) => h.pageId),
    ).toContain("acessos");
    expect(searchDocs(partnerDocs, "hmac")[0].pageId).toBe("webhooks");
  });
});
