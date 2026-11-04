import { describe, expect, it } from "vitest";
import {
  buildToc,
  groupedPages,
  parseInline,
  plainText,
  prevNext,
  searchDocs,
  slugify,
  validateSite,
  type DocsSite,
} from "./docs-model";

const site: DocsSite = {
  title: "Docs",
  groups: [
    { id: "start", label: "Primeiros passos" },
    { id: "api", label: "API" },
  ],
  samples: {
    hello: {
      title: "Olá",
      description: "Exemplo",
      variants: { curl: "curl x" },
    },
  },
  pages: [
    {
      id: "intro",
      group: "start",
      title: "Introdução",
      summary: "Comece por aqui.",
      sections: [
        {
          id: "visao",
          title: "Visão geral",
          blocks: [
            {
              type: "p",
              text: "Use o [OAuth](oauth#troca) com `state` e **PKCE**.",
            },
          ],
        },
      ],
    },
    {
      id: "oauth",
      group: "api",
      title: "OAuth e autorização",
      summary: "Autentique o titular.",
      sections: [
        {
          id: "gere",
          title: "Gere o verificador",
          blocks: [
            { type: "h3", text: "Passo curto" },
            { type: "p", text: "O verificador tem 64 caracteres." },
          ],
        },
        {
          id: "troca",
          title: "Troque o código",
          blocks: [
            { type: "p", text: "Envie o code ao endpoint de token." },
            { type: "samples", id: "hello" },
            {
              type: "table",
              caption: "Erros",
              columns: ["Código", "Ação"],
              rows: [["401", "Renove o token"]],
            },
          ],
        },
      ],
    },
    {
      id: "erros",
      group: "api",
      title: "Erros",
      summary: "Trate falhas.",
      sections: [
        {
          id: "tabela",
          title: "Códigos",
          blocks: [
            {
              type: "callout",
              tone: "warning",
              title: "Cuidado",
              text: "Nunca registre o client_secret.",
            },
          ],
        },
      ],
    },
  ],
};

describe("parseInline", () => {
  it("splits code, bold and links out of plain text", () => {
    expect(
      parseInline("Use o [OAuth](oauth#troca) com `state` e **PKCE**."),
    ).toEqual([
      { kind: "text", text: "Use o " },
      { kind: "link", text: "OAuth", to: "oauth#troca" },
      { kind: "text", text: " com " },
      { kind: "code", text: "state" },
      { kind: "text", text: " e " },
      { kind: "bold", text: "PKCE" },
      { kind: "text", text: "." },
    ]);
  });
  it("keeps unmatched markers as literal text", () => {
    expect(parseInline("a `b e **c")).toEqual([
      { kind: "text", text: "a `b e **c" },
    ]);
  });
  it("does not parse markup inside code", () => {
    expect(parseInline("`**x**`")).toEqual([{ kind: "code", text: "**x**" }]);
  });
  it("returns nothing for an empty string", () => {
    expect(parseInline("")).toEqual([]);
  });
});

describe("plainText", () => {
  it("drops the markup and keeps the words", () => {
    expect(
      plainText("Use o [OAuth](oauth#troca) com `state` e **PKCE**."),
    ).toBe("Use o OAuth com state e PKCE.");
  });
});

describe("slugify", () => {
  it("makes accent-free kebab-case ids", () => {
    expect(slugify("Troque o código: já!")).toBe("troque-o-codigo-ja");
    expect(slugify("  OAuth + PKCE  ")).toBe("oauth-pkce");
  });
});

describe("buildToc", () => {
  it("lists sections and the h3 blocks inside them, in order", () => {
    expect(buildToc(site.pages[1])).toEqual([
      { id: "gere", title: "Gere o verificador", level: 2 },
      { id: "passo-curto", title: "Passo curto", level: 3 },
      { id: "troca", title: "Troque o código", level: 2 },
    ]);
  });
});

describe("page order", () => {
  it("groups pages in the order the groups are declared", () => {
    expect(
      groupedPages(site).map((g) => [g.id, g.pages.map((p) => p.id)]),
    ).toEqual([
      ["start", ["intro"]],
      ["api", ["oauth", "erros"]],
    ]);
  });
  it("finds the previous and next page across groups", () => {
    expect(prevNext(site, "oauth")).toEqual({
      prev: site.pages[0],
      next: site.pages[2],
    });
    expect(prevNext(site, "intro").prev).toBeUndefined();
    expect(prevNext(site, "erros").next).toBeUndefined();
  });
});

describe("searchDocs", () => {
  it("ignores case and accents", () => {
    const hits = searchDocs(site, "AUTORIZACAO");
    expect(hits[0].pageId).toBe("oauth");
  });
  it("ranks a title match above a body match", () => {
    const hits = searchDocs(site, "oauth");
    expect(hits[0].pageId).toBe("oauth");
    expect(hits.map((h) => h.pageId)).toContain("intro");
  });
  it("requires every word to be present", () => {
    expect(searchDocs(site, "oauth verificador").map((h) => h.pageId)).toEqual([
      "oauth",
    ]);
    expect(searchDocs(site, "oauth zzz")).toEqual([]);
  });
  it("points at the section that holds the match and shows the words around it", () => {
    const [hit] = searchDocs(site, "client_secret");
    expect(hit.pageId).toBe("erros");
    expect(hit.sectionId).toBe("tabela");
    expect(hit.sectionTitle).toBe("Códigos");
    expect(hit.snippet?.match.toLowerCase()).toBe("client_secret");
    expect(hit.snippet?.before).toContain("Nunca registre");
  });
  it("searches table cells and sample titles too", () => {
    expect(searchDocs(site, "renove")[0].sectionId).toBe("troca");
    expect(searchDocs(site, "olá")[0].sectionId).toBe("troca");
  });
  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchDocs(site, "  ")).toEqual([]);
    expect(searchDocs(site, "o", 2).length).toBeLessThanOrEqual(2);
  });
});

describe("validateSite", () => {
  it("accepts a consistent site", () => {
    expect(validateSite(site)).toEqual([]);
  });
  it("reports duplicate ids, unknown groups, unknown samples and broken links", () => {
    const broken: DocsSite = {
      ...site,
      pages: [
        site.pages[0],
        { ...site.pages[0], id: "intro" },
        {
          id: "x",
          group: "nope",
          title: "X",
          summary: "",
          sections: [
            {
              id: "a",
              title: "A",
              blocks: [
                { type: "samples", id: "missing" },
                { type: "p", text: "[a](ghost) [b](oauth#nada)" },
              ],
            },
            { id: "a", title: "A2", blocks: [] },
          ],
        },
        site.pages[1],
      ],
    };
    const problems = validateSite(broken).join("\n");
    expect(problems).toMatch(/página duplicada.*intro/);
    expect(problems).toMatch(/grupo desconhecido.*nope/);
    expect(problems).toMatch(/seção duplicada.*x#a/);
    expect(problems).toMatch(/exemplo inexistente.*missing/);
    expect(problems).toMatch(/link quebrado.*ghost/);
    expect(problems).toMatch(/link quebrado.*oauth#nada/);
  });
});
