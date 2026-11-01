import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  areaPath,
  dayLabel,
  linePath,
  niceScale,
  pointsFor,
} from "./chart-model";
import type { TrendPoint } from "./executive-chart-types";
import { useElementWidth } from "./useElementWidth";
import "./executive-charts.css";

export type { MultiSeries, TrendPoint } from "./executive-chart-types";
export {
  FunnelChart,
  RankedBars,
  SegmentedBar,
  Sparkline,
  type FunnelRow,
  type RankedRow,
  type Segment,
} from "./ExecutiveBars";
export { MultiTrendChart } from "./ExecutiveMultiTrendChart";

/** Daily line with an optional dashed comparison, hover and arrow-key reading. */
export function TrendChart({
  current,
  previous,
  format,
  formatAxis,
  label,
  currentName = "Período atual",
  previousName = "Período anterior",
}: {
  current: TrendPoint[];
  previous?: TrendPoint[];
  format: (value: number) => string;
  formatAxis: (value: number) => string;
  label: string;
  currentName?: string;
  previousName?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const compact = width > 0 && width < 520;
  const height = compact ? 200 : 260;
  const margin = { top: 12, right: 12, bottom: 24, left: compact ? 44 : 64 };
  const innerW = Math.max(40, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;

  const max = Math.max(
    ...current.map((p) => p.value),
    ...(previous ?? []).map((p) => p.value),
    0,
  );
  const scale = niceScale(max);
  const currentPoints = useMemo(
    () =>
      pointsFor(
        current.map((p) => p.value),
        innerW,
        innerH,
        scale.max,
      ),
    [current, innerW, innerH, scale.max],
  );
  const previousPoints = useMemo(
    () =>
      previous
        ? pointsFor(
            previous.map((p) => p.value),
            innerW,
            innerH,
            scale.max,
          )
        : [],
    [previous, innerW, innerH, scale.max],
  );

  function indexAt(clientX: number, rect: DOMRect) {
    const x = clientX - rect.left - margin.left;
    return Math.min(
      current.length - 1,
      Math.max(0, Math.round((x / innerW) * (current.length - 1))),
    );
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const last = current.length - 1;
    const keys: Record<string, number> = {
      ArrowLeft: Math.max(0, (active ?? last) - 1),
      ArrowRight: Math.min(last, (active ?? -1) + 1),
      Home: 0,
      End: last,
    };
    if (event.key in keys) {
      event.preventDefault();
      setActive(keys[event.key]);
    } else if (event.key === "Escape") setActive(null);
  }

  const shown = active ?? current.length - 1;
  const here = current[shown];
  const before = previous?.[shown];
  const xs = [0, Math.floor((current.length - 1) / 2), current.length - 1];

  return (
    <div className="xc-trend">
      <div
        ref={ref}
        className="xc-trend-plot"
        tabIndex={0}
        role="group"
        aria-label={`${label}. Use as setas para ler cada dia.`}
        aria-describedby={`${id}-reading`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) =>
          setActive(
            indexAt(event.clientX, event.currentTarget.getBoundingClientRect()),
          )
        }
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} aria-hidden="true">
            <g transform={`translate(${margin.left} ${margin.top})`}>
              {scale.ticks.map((tick) => {
                const y = innerH - (tick / (scale.max || 1)) * innerH;
                return (
                  <g key={tick}>
                    <line
                      className="xc-grid"
                      x1={0}
                      x2={innerW}
                      y1={y}
                      y2={y}
                    />
                    <text className="xc-axis" x={-8} y={y + 4} textAnchor="end">
                      {formatAxis(tick)}
                    </text>
                  </g>
                );
              })}
              {xs.map((index, position) => (
                <text
                  key={index}
                  className="xc-axis"
                  x={currentPoints[index]?.x ?? 0}
                  y={innerH + 18}
                  textAnchor={
                    position === 0 ? "start" : position === 2 ? "end" : "middle"
                  }
                >
                  {dayLabel(current[index].date)}
                </text>
              ))}
              <path className="xc-area" d={areaPath(currentPoints, innerH)} />
              {previous && (
                <path
                  className="xc-line xc-line-previous"
                  d={linePath(previousPoints)}
                />
              )}
              <path
                className="xc-line xc-line-current"
                d={linePath(currentPoints)}
              />
              {active !== null && currentPoints[active] && (
                <g>
                  <line
                    className="xc-cursor"
                    x1={currentPoints[active].x}
                    x2={currentPoints[active].x}
                    y1={0}
                    y2={innerH}
                  />
                  <circle
                    className="xc-dot"
                    cx={currentPoints[active].x}
                    cy={currentPoints[active].y}
                    r={4.5}
                  />
                  {previousPoints[active] && (
                    <circle
                      className="xc-dot xc-dot-previous"
                      cx={previousPoints[active].x}
                      cy={previousPoints[active].y}
                      r={3.5}
                    />
                  )}
                </g>
              )}
            </g>
          </svg>
        )}
      </div>
      <p className="xc-reading" id={`${id}-reading`} aria-live="polite">
        <strong>{dayLabel(here.date)}</strong>
        <span className="xc-key xc-key-current">
          {currentName}: <b>{format(here.value)}</b>
        </span>
        {before && (
          <span className="xc-key xc-key-previous">
            {previousName}: <b>{format(before.value)}</b>
          </span>
        )}
      </p>
    </div>
  );
}
