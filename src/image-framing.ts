/** Side of the square preview canvas, in CSS pixels. */
export const FRAME = 240;
/** Longest side allowed for the exported framed image. */
export const MAX_SIDE = 1024;

export function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
