export function validateReason(
  text: string,
  min: number,
  max: number,
): { ok: boolean; length: number; message: string } {
  const length = text.trim().length;
  if (length < min)
    return {
      ok: false,
      length,
      message: `Escreva pelo menos ${min} caracteres (${length}/${min}).`,
    };
  if (length > max)
    return {
      ok: false,
      length,
      message: `Use no máximo ${max} caracteres (${length}/${max}).`,
    };
  return { ok: true, length, message: "" };
}

const TYPOGRAPHIC: [RegExp, string][] = [
  [/[“”]/g, '"'],
  [/[‘’]/g, "'"],
  [/[–—]/g, "-"],
  [/…/g, "..."],
];

/** RFC 8187 attr-char: everything else is percent-encoded as UTF-8. */
const encodeUtf8 = (text: string) =>
  encodeURIComponent(text).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

/**
 * Builds the optional change-reason header (3–500 characters). The text is flattened
 * to one line. Latin-1 text (accents included) keeps the plain `X-Change-Reason`, which
 * every backend release reads. Anything beyond Latin-1 (emoji, other scripts) uses
 * `X-Change-Reason*` with UTF-8 percent-encoding, and only that header is sent. The
 * backend records the default purpose when no header is present.
 */
export function changeReasonHeaders(
  reason: string | undefined,
): Record<string, string> {
  if (!reason) return {};
  let text = reason.replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of TYPOGRAPHIC)
    text = text.replace(pattern, replacement);
  text = Array.from(text).slice(0, 500).join("");
  if (Array.from(text).length < 3) return {};
  if (Array.from(text).every((char) => char.charCodeAt(0) <= 0xff))
    return { "X-Change-Reason": text };
  return { "X-Change-Reason*": `UTF-8''${encodeUtf8(text)}` };
}
