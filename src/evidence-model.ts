/** Same pattern the backend enforces for a commercial version identifier. */
export const VERSION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/;

const SUFFIX = /^(.*)-(\d{4})-(\d{2})-v(\d+)$/;
const FALLBACK_PREFIX = "commercial";
const MAX_LENGTH = 120;

export async function sha256Hex(input: string | ArrayBuffer | Uint8Array) {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Year and month on the Brasília calendar, which is the one the team reads. */
function monthInSaoPaulo(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}`;
}

function cleanPrefix(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/-+$/, "");
  return cleaned || FALLBACK_PREFIX;
}

/**
 * Suggests the identifier that follows the one in force: `<prefix>-YYYY-MM-vN`.
 * The counter grows inside a month and restarts at v1 in a new month; ids
 * already used are skipped so the suggestion never collides.
 */
export function nextVersionId(
  current: string,
  existing: readonly string[],
  now: Date,
) {
  const month = monthInSaoPaulo(now);
  const match = SUFFIX.exec(current.trim());
  const prefix = cleanPrefix(match ? match[1] : current);
  const room = MAX_LENGTH - `-${month}-v999`.length;
  const head =
    prefix.slice(0, room).replace(/[^a-zA-Z0-9]+$/, "") || FALLBACK_PREFIX;
  const taken = new Set(existing);
  taken.add(current.trim());
  let counter =
    match && `${match[2]}-${match[3]}` === month ? Number(match[4]) + 1 : 1;
  while (taken.has(`${head}-${month}-v${counter}`)) counter += 1;
  return `${head}-${month}-v${counter}`;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const money = (cents: number) => brl.format(cents / 100).replaceAll(" ", " ");
const percent = (bps: number) =>
  `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export type DeclarationInput = {
  version: string;
  previousVersion: string;
  previousFeeCents: number;
  nextFeeCents: number;
  previousRateBps: number;
  nextRateBps: number;
  reason: string;
  generatedAt: string;
};

/**
 * The text whose SHA-256 is offered as evidence when there is no provider
 * document to hash. It is stable for the same input, so anyone holding the
 * saved text can hash it again and get the same value.
 */
export function declarationText(input: DeclarationInput) {
  return [
    "Aferis AI — declaração de tarifa PIX",
    "Este texto foi gerado pelo painel. Não é um documento do provedor.",
    "",
    `Versão: ${input.version}`,
    `Versão anterior: ${input.previousVersion}`,
    `Tarifa PIX fixa: ${money(input.previousFeeCents)} → ${money(input.nextFeeCents)}`,
    `Tarifa PIX percentual: ${percent(input.previousRateBps)} → ${percent(input.nextRateBps)}`,
    `Motivo: ${input.reason.trim()}`,
    `Gerado em: ${input.generatedAt}`,
    "",
  ].join("\n");
}
