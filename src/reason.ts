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
