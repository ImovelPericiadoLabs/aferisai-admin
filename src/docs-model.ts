import type { CodeLanguage } from "./code-highlight";

/**
 * Content model for documentation sites. A site is plain data (pages made of typed blocks, plus a
 * shared set of multi-language code samples), so a new documentation area is a new data file, not
 * a new screen. Everything here is pure and covered by tests; the React side only renders it.
 */
export type SampleLanguage =
  "curl" | "node" | "python" | "java" | "csharp" | "go";

export type CodeSample = {
  title: string;
  description: string;
  variants: Partial<Record<SampleLanguage, string>>;
};

export type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | {
      type: "callout";
      tone: "note" | "tip" | "warning" | "danger";
      title?: string;
      text: string;
    }
  | { type: "code"; language: CodeLanguage; label?: string; code: string }
  | { type: "samples"; id: string }
  | { type: "table"; caption: string; columns: string[]; rows: string[][] }
  | { type: "links"; items: { to: string; title: string; text: string }[] };

export type DocSection = { id: string; title: string; blocks: Block[] };

export type DocPage = {
  id: string;
  group: string;
  title: string;
  summary: string;
  /** Who this page is for, shown under the title. */
  audience?: string[];
  /** API scopes the page's operations need. */
  scopes?: string[];
  sections: DocSection[];
};

export type DocsSite = {
  title: string;
  groups: { id: string; label: string }[];
  pages: DocPage[];
  samples: Record<string, CodeSample>;
};

/* ── Inline markup: `code`, **bold**, [text](page-id#section-id) ───────────────────────────── */

export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; to: string };

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last)
      nodes.push({ kind: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) nodes.push({ kind: "code", text: match[1] });
    else if (match[2] !== undefined)
      nodes.push({ kind: "bold", text: match[2] });
    else nodes.push({ kind: "link", text: match[3], to: match[4] });
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push({ kind: "text", text: text.slice(last) });
  return nodes;
}

export function plainText(text: string): string {
  return parseInline(text)
    .map((node) => node.text)
    .join("");
}

/** Lower-cases and drops accents one UTF-16 unit at a time, so indexes stay aligned with the original. */
export function fold(text: string): string {
  return text
    .split("")
    .map((unit) => unit.normalize("NFD")[0].toLowerCase())
    .join("");
}

export function slugify(text: string): string {
  return fold(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ── Structure ─────────────────────────────────────────────────────────────────────────── */

export type TocItem = { id: string; title: string; level: 2 | 3 };

export function buildToc(page: DocPage): TocItem[] {
  return page.sections.flatMap((section) => [
    { id: section.id, title: section.title, level: 2 as const },
    ...section.blocks.flatMap((block) =>
      block.type === "h3"
        ? [{ id: slugify(block.text), title: block.text, level: 3 as const }]
        : [],
    ),
  ]);
}

export function groupedPages(site: DocsSite) {
  return site.groups
    .map((group) => ({
      ...group,
      pages: site.pages.filter((page) => page.group === group.id),
    }))
    .filter((group) => group.pages.length > 0);
}

export function orderedPages(site: DocsSite): DocPage[] {
  return groupedPages(site).flatMap((group) => group.pages);
}

export function prevNext(site: DocsSite, pageId: string) {
  const pages = orderedPages(site);
  const index = pages.findIndex((page) => page.id === pageId);
  return {
    prev: index > 0 ? pages[index - 1] : undefined,
    next: index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined,
  };
}

/* ── Search ────────────────────────────────────────────────────────────────────────────── */

function blockText(block: Block, site: DocsSite): string {
  switch (block.type) {
    case "p":
    case "h3":
      return plainText(block.text);
    case "list":
      return block.items.map(plainText).join(" ");
    case "steps":
      return block.items
        .map((item) => `${item.title} ${plainText(item.text)}`)
        .join(" ");
    case "callout":
      return `${block.title ?? ""} ${plainText(block.text)}`;
    case "code":
      return block.code;
    case "samples": {
      const sample = site.samples[block.id];
      return sample ? `${sample.title} ${sample.description}` : "";
    }
    case "table":
      return [
        block.caption,
        ...block.columns,
        ...block.rows.flat().map(plainText),
      ].join(" ");
    case "links":
      return block.items
        .map((item) => `${item.title} ${plainText(item.text)}`)
        .join(" ");
  }
}

export type SearchHit = {
  pageId: string;
  sectionId: string | null;
  pageTitle: string;
  sectionTitle: string | null;
  group: string;
  snippet: { before: string; match: string; after: string } | null;
  score: number;
};

function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = haystack.indexOf(needle);
  while (from !== -1 && count < 5) {
    count += 1;
    from = haystack.indexOf(needle, from + needle.length);
  }
  return count;
}

function snippetAround(text: string, folded: string, token: string) {
  const at = folded.indexOf(token);
  if (at === -1) return null;
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + token.length + 70);
  return {
    before: (start > 0 ? "…" : "") + text.slice(start, at),
    match: text.slice(at, at + token.length),
    after: text.slice(at + token.length, end) + (end < text.length ? "…" : ""),
  };
}

/** Pages whose title, summary and sections together contain every word of the query, best first. */
export function searchDocs(
  site: DocsSite,
  query: string,
  limit = 8,
): SearchHit[] {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const groupLabel = new Map(
    site.groups.map((group) => [group.id, group.label]),
  );
  const hits: (SearchHit & { order: number })[] = [];

  site.pages.forEach((page, order) => {
    const title = fold(page.title);
    const summary = fold(page.summary);
    const sections = page.sections.map((section) => {
      const text = section.blocks
        .map((block) => blockText(block, site))
        .join(" \n ");
      return {
        section,
        text,
        folded: fold(text),
        heading: fold(section.title),
      };
    });
    const everywhere = [
      title,
      summary,
      ...sections.flatMap((s) => [s.heading, s.folded]),
    ].join(" \n ");
    if (!tokens.every((token) => everywhere.includes(token))) return;

    let pageScore = 0;
    for (const token of tokens) {
      if (title.includes(token)) pageScore += 10;
      if (summary.includes(token)) pageScore += 4;
    }
    let best: { score: number; index: number } | null = null;
    sections.forEach((s, index) => {
      let score = 0;
      for (const token of tokens) {
        if (s.heading.includes(token)) score += 6;
        score += occurrences(s.folded, token);
      }
      if (score > 0 && (!best || score > best.score)) best = { score, index };
    });
    const chosen = best as { score: number; index: number } | null;
    const section = chosen ? sections[chosen.index] : null;
    const firstToken = tokens.find((token) => section?.folded.includes(token));
    hits.push({
      order,
      pageId: page.id,
      sectionId: section ? section.section.id : null,
      pageTitle: page.title,
      sectionTitle: section ? section.section.title : null,
      group: groupLabel.get(page.group) ?? page.group,
      snippet:
        section && firstToken
          ? snippetAround(section.text, section.folded, firstToken)
          : null,
      score: pageScore + (chosen?.score ?? 0),
    });
  });

  return hits
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((hit) => {
      const { order, ...rest } = hit;
      void order;
      return rest;
    });
}

/* ── Integrity ─────────────────────────────────────────────────────────────────────────── */

function inlineTexts(block: Block): string[] {
  switch (block.type) {
    case "p":
      return [block.text];
    case "list":
      return block.items;
    case "steps":
      return block.items.map((item) => item.text);
    case "callout":
      return [block.text];
    case "table":
      return block.rows.flat();
    case "links":
      return block.items.map((item) => item.text);
    default:
      return [];
  }
}

/** Problems that would show up as a dead link, a blank panel or a clashing anchor. Empty when fine. */
export function validateSite(site: DocsSite): string[] {
  const problems: string[] = [];
  const groups = new Set(site.groups.map((group) => group.id));
  const targets = new Map<string, Set<string>>();
  const seenPages = new Set<string>();
  for (const page of site.pages) {
    if (seenPages.has(page.id)) problems.push(`página duplicada: ${page.id}`);
    seenPages.add(page.id);
    if (!groups.has(page.group))
      problems.push(`grupo desconhecido em ${page.id}: ${page.group}`);
    const ids = new Set<string>();
    for (const section of page.sections) {
      if (ids.has(section.id))
        problems.push(`seção duplicada: ${page.id}#${section.id}`);
      ids.add(section.id);
    }
    for (const item of buildToc(page).filter((entry) => entry.level === 3)) {
      if (ids.has(item.id))
        problems.push(`âncora duplicada: ${page.id}#${item.id}`);
      ids.add(item.id);
    }
    if (!targets.has(page.id)) targets.set(page.id, ids);
  }
  const checkLink = (from: string, to: string) => {
    if (/^https?:\/\//.test(to)) return;
    const [pageId, anchor] = to.split("#");
    const anchors = targets.get(pageId);
    if (!anchors || (anchor !== undefined && !anchors.has(anchor)))
      problems.push(`link quebrado em ${from}: ${to}`);
  };
  for (const page of site.pages)
    for (const section of page.sections)
      for (const block of section.blocks) {
        const where = `${page.id}#${section.id}`;
        if (block.type === "samples" && !site.samples[block.id])
          problems.push(`exemplo inexistente em ${where}: ${block.id}`);
        for (const text of inlineTexts(block))
          for (const node of parseInline(text))
            if (node.kind === "link") checkLink(where, node.to);
        if (block.type === "links")
          for (const item of block.items) checkLink(where, item.to);
      }
  return problems;
}
