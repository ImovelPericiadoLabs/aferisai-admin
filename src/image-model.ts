export function clampZoom(zoom: number): number {
  return Math.min(4, Math.max(1, zoom));
}

const clampOffset = (offset: number) => Math.min(1, Math.max(-1, offset));

export function computeCrop(input: {
  naturalWidth: number;
  naturalHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}): { sx: number; sy: number; size: number } {
  const { naturalWidth: width, naturalHeight: height } = input;
  const size = Math.min(width, height) / clampZoom(input.zoom);
  return {
    sx: ((width - size) * (clampOffset(input.offsetX) + 1)) / 2,
    sy: ((height - size) * (clampOffset(input.offsetY) + 1)) / 2,
    size,
  };
}

export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
