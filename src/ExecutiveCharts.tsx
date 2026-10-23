import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  areaPath,
  dayLabel,
  linePath,
  niceScale,
  pointsFor,
  shareBps,
} from "./chart-model";
import { formatPercentBps } from "./executive-model";
import "./executive-charts.css";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setWidth(node.clientWidth));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export type TrendPoint = { date: string; value: number };

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
  const [ref, width] = useWidth<HTMLDivElement>();
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

/** Tiny trend line for KPI cards. Decorative: the number next to it carries the meaning. */
export function Sparkline({ values }: { values: number[] }) {
  const w = 96;
  const h = 28;
  const max = Math.max(...values, 1);
  const points = pointsFor(values, w, h - 4, max).map((p) => ({
    x: p.x,
    y: p.y + 2,
  }));
  return (
    <svg
      className="xc-spark"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <path className="xc-spark-area" d={areaPath(points, h)} />
      <path className="xc-spark-line" d={linePath(points)} />
    </svg>
  );
}

export type FunnelRow = {
  key: string;
  label: string;
  count: number;
  ofTopBps: number | null;
  ofPreviousBps: number | null;
};

export function FunnelChart({ rows }: { rows: FunnelRow[] }) {
  const top = rows[0]?.count ?? 0;
  return (
    <ol className="xc-funnel" aria-label="Funil de conversão">
      {rows.map((row, index) => (
        <li key={row.key}>
          <div className="xc-funnel-head">
            <span>{row.label}</span>
            <strong>{new Intl.NumberFormat("pt-BR").format(row.count)}</strong>
          </div>
          <div className="xc-bar" aria-hidden="true">
            <i
              style={{
                width: `${top ? Math.max(2, (row.count / top) * 100) : 0}%`,
              }}
              data-step={index}
            />
          </div>
          <small>
            {row.ofTopBps === null
              ? "—"
              : `${formatPercentBps(row.ofTopBps)} do total`}
            {row.ofPreviousBps !== null &&
              ` · ${formatPercentBps(row.ofPreviousBps)} da etapa anterior`}
          </small>
        </li>
      ))}
    </ol>
  );
}

export type RankedRow = {
  key: string;
  label: string;
  value: number;
  display: string;
  hint?: string;
  leading?: ReactNode;
};

export function RankedBars({
  rows,
  label,
  tone = "primary",
  shareOf = "do total",
}: {
  rows: RankedRow[];
  label: string;
  tone?: "primary" | "success" | "warning" | "info";
  shareOf?: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="xc-ranked" aria-label={label}>
      {rows.map((row) => (
        <li key={row.key}>
          <div className="xc-ranked-head">
            <span className="xc-ranked-label">
              {row.leading}
              {row.label}
            </span>
            <strong>{row.display}</strong>
          </div>
          <div className="xc-bar" aria-hidden="true">
            <i
              data-tone={tone}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <small>
            {formatPercentBps(shareBps(row.value, total))} {shareOf}
            {row.hint ? ` · ${row.hint}` : ""}
          </small>
        </li>
      ))}
    </ul>
  );
}

export type Segment = {
  key: string;
  label: string;
  value: number;
  display: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
};

export function SegmentedBar({
  segments,
  label,
}: {
  segments: Segment[];
  label: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="xc-segmented">
      <div
        className="xc-segments"
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.display}`).join(", ")}`}
      >
        {segments.map((s) => (
          <i
            key={s.key}
            data-tone={s.tone}
            style={{ flexGrow: total ? Math.max(s.value, total * 0.005) : 1 }}
          />
        ))}
      </div>
      <ul className="xc-legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className="xc-swatch" data-tone={s.tone} aria-hidden="true" />
            <span>{s.label}</span>
            <strong>{s.display}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
