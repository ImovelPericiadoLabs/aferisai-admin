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

/**
 * Builds the optional `X-Change-Reason` header (3–500 characters). Header values
 * cannot hold line breaks or characters outside Latin-1, so the text is flattened
 * and anything else becomes "?". The backend records the default purpose when
 * the header is absent.
 */
export function changeReasonHeaders(
  reason: string | undefined,
): Record<string, string> {
  if (!reason) return {};
  let text = reason.replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of TYPOGRAPHIC)
    text = text.replace(pattern, replacement);
  text = Array.from(text, (char) => (char.charCodeAt(0) > 0xff ? "?" : char))
    .join("")
    .slice(0, 500);
  return text.length >= 3 ? { "X-Change-Reason": text } : {};
}
