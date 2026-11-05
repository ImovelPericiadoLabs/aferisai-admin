import { scopeLabel } from "./display-labels";

export type ScopeGroup = {
  id: string;
  label: string;
  items: { code: string; label: string }[];
};

const byLabel = (a: { label: string }, b: { label: string }) =>
  a.label.localeCompare(b.label, "pt-BR");

const GROUPS: {
  id: string;
  label: string;
  match: (scope: string) => boolean;
}[] = [
  {
    id: "analysis",
    label: "Análises",
    match: (s) => s.startsWith("analysis:") || s.startsWith("application:"),
  },
  {
    id: "registry",
    label: "Pedidos de registro",
    match: (s) => s.startsWith("registry:") || s.startsWith("certificate:"),
  },
  {
    id: "payment",
    label: "Pagamentos",
    match: (s) => s.startsWith("payment:"),
  },
  {
    id: "events",
    label: "Eventos recebidos",
    match: (s) => s.startsWith("events:"),
  },
];

/** What a person agreed to, by subject, in plain words and a stable order. */
export function groupScopes(scopes: readonly string[]): ScopeGroup[] {
  const groups: ScopeGroup[] = [];
  const known = new Set<string>();
  for (const group of GROUPS) {
    const items = scopes
      .filter((scope) => group.match(scope))
      .map((code) => ({ code, label: scopeLabel(code) }))
      .sort(byLabel);
    items.forEach((item) => known.add(item.code));
    if (items.length) groups.push({ id: group.id, label: group.label, items });
  }
  const other = scopes
    .filter((scope) => !known.has(scope))
    .map((code) => ({ code, label: scopeLabel(code) }))
    .sort(byLabel);
  if (other.length) groups.push({ id: "other", label: "Outras", items: other });
  return groups;
}

/** Start and end of an id: enough to recognise it, short enough to read. */
export function shortId(id: string): string {
  return id.length <= 16 ? id : `${id.slice(0, 8)}…${id.slice(-4)}`;
}

type ProfileLinks = {
  website_url: string | null;
  support_url: string | null;
  privacy_url: string | null;
  terms_url: string | null;
};

const LINKS = [
  ["website_url", "Site"],
  ["support_url", "Suporte"],
  ["privacy_url", "Privacidade"],
  ["terms_url", "Termos"],
] as const;

/** Only https addresses become links: a profile is typed by the partner, not trusted. */
export function partnerLinks(
  profile: ProfileLinks | null | undefined,
): { label: string; href: string }[] {
  if (!profile) return [];
  const links: { label: string; href: string }[] = [];
  for (const [field, label] of LINKS) {
    const raw = profile[field];
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol === "https:") links.push({ label, href: url.href });
    } catch {
      /* not a URL: leave it out */
    }
  }
  return links;
}
