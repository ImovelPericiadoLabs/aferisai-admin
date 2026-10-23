export type Point = { x: number; y: number };

/**
 * A top value rounded up to a readable step, plus even ticks. With `integer`, steps are
 * 1, 2 or 5 times a power of ten and the tick count is 3 to 5 intervals, so counts read
 * 10, 20, 30 instead of 7.5, 15, 22.5.
 */
export function niceScale(
  value: number,
  options: { integer?: boolean } = {},
): { max: number; ticks: number[] } {
  if (options.integer) {
    const target = Math.max(1, Math.ceil(value));
    for (let power = 1; ; power *= 10)
      for (const multiple of [1, 2, 5]) {
        const step = multiple * power;
        const intervals = Math.max(2, Math.ceil(target / step));
        if (intervals <= 5 && (intervals >= 3 || target <= 2 * step))
          return {
            max: step * intervals,
            ticks: Array.from({ length: intervals + 1 }, (_, i) => i * step),
          };
      }
  }
  if (value <= 0) return { max: 4, ticks: [0, 1, 2, 3, 4] };
  const intervals = 4;
  const rough = value / intervals;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10]
      .map((m) => m * power)
      .find((candidate) => candidate * intervals >= value) ?? 10 * power;
  const ticks = Array.from({ length: intervals + 1 }, (_, i) => i * step);
  return { max: step * intervals, ticks };
}

export function pointsFor(
  values: number[],
  width: number,
  height: number,
  max: number,
): Point[] {
  if (values.length === 1)
    return [{ x: width / 2, y: height - (values[0] / (max || 1)) * height }];
  return values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - (value / (max || 1)) * height,
  }));
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export function linePath(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`)
    .join("");
}

export function areaPath(points: Point[], baseline: number): string {
  if (points.length === 0) return "";
  const last = points[points.length - 1];
  const first = points[0];
  return `${linePath(points)}L${fmt(last.x)} ${fmt(baseline)}L${fmt(first.x)} ${fmt(baseline)}Z`;
}

export const shareBps = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 10000);

export const dayLabel = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
