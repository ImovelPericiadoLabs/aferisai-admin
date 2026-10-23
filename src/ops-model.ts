import { csvEscape } from "./executive-export";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** How long ago, in the largest sensible unit. */
export function ageLabel(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "—";
  const diff = Math.max(0, now - time);
  if (diff < MIN) return "agora";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h`;
  return `${Math.floor(diff / DAY)} d`;
}

export type AgeTone = "ok" | "warn" | "danger";

export function ageTone(
  iso: string,
  now: number,
  warnAfterHours: number,
  dangerAfterHours: number,
): AgeTone {
  const hours = (now - Date.parse(iso)) / HOUR;
  if (hours >= dangerAfterHours) return "danger";
  if (hours >= warnAfterHours) return "warn";
  return "ok";
}

const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Every typed word must appear in some field (case and accents ignored). */
export function matchesQuery(fields: string[], query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(fields.join(" "));
  return words.every((word) => haystack.includes(word));
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const line = (cells: string[]) => cells.map(csvEscape).join(";");
  return `﻿${[headers, ...rows].map(line).join("\r\n")}`;
}

export type Density = "comfortable" | "compact";
export type TablePrefs = { density: Density; hidden: string[] };
type Store = Pick<Storage, "getItem" | "setItem">;

const DEFAULTS: TablePrefs = { density: "comfortable", hidden: [] };

function browserStore(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readPrefs(
  key: string,
  storage: Store | null = browserStore(),
): TablePrefs {
  try {
    const raw = storage?.getItem(`ops-table:${key}`);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<TablePrefs>;
    return {
      density: parsed.density === "compact" ? "compact" : "comfortable",
      hidden: Array.isArray(parsed.hidden)
        ? parsed.hidden.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writePrefs(
  key: string,
  prefs: TablePrefs,
  storage: Store | null = browserStore(),
): void {
  try {
    storage?.setItem(`ops-table:${key}`, JSON.stringify(prefs));
  } catch {
    /* preferences are a convenience */
  }
}
