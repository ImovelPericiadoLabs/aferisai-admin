import {
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { dayLabel, linePath, niceScale, pointsFor } from "./chart-model";
import type { MultiSeries } from "./executive-chart-types";
import { useElementWidth } from "./useElementWidth";

const fullDay = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * Several daily lines on one scale, with a hover/touch/keyboard crosshair and a tooltip
 * that lists every visible series. Legend chips show or hide a line.
 */
export function MultiTrendChart({
  series,
  compare,
  format,
  formatAxis,
  label,
  unit,
  integer = false,
}: {
  series: MultiSeries[];
  compare: boolean;
  format: (value: number) => string;
  formatAxis: (value: number) => string;
  label: string;
  unit: string;
  /** Counts: ticks are whole numbers. */
  integer?: boolean;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hidden, setHidden] = useState<string[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const visible = series.filter((item) => !hidden.includes(item.key));
  const length = series[0]?.current.length ?? 0;
  const compact = width > 0 && width < 520;
  const height = compact ? 220 : 280;
  const margin = { top: 12, right: 14, bottom: 26, left: compact ? 34 : 44 };
  const innerW = Math.max(40, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;
  const max = Math.max(
    ...visible.flatMap((item) => [
      ...item.current.map((p) => p.value),
      ...(compare ? (item.previous ?? []).map((p) => p.value) : []),
    ]),
    0,
  );
  const scale = niceScale(max, { integer });
  const geometry = useMemo(
    () =>
      visible.map((item) => ({
        item,
        current: pointsFor(
          item.current.map((p) => p.value),
          innerW,
          innerH,
          scale.max,
        ),
        previous:
          compare && item.previous
            ? pointsFor(
                item.previous.map((p) => p.value),
                innerW,
                innerH,
                scale.max,
              )
            : [],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, hidden, compare, innerW, innerH, scale.max],
  );

  function indexAt(clientX: number, rect: DOMRect) {
    const x = clientX - rect.left - margin.left;
    return Math.min(
      length - 1,
      Math.max(0, Math.round((x / innerW) * (length - 1))),
    );
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const last = length - 1;
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

  if (length === 0) return null;
  const shown = active ?? length - 1;
  const date = series[0].current[shown].date;
  const cursorX = geometry[0]?.current[shown]?.x ?? 0;
  // Open the tooltip on the side that has room for it (about 210px wide).
  const flip = margin.left + cursorX + 12 + 210 > width;
  const xs = [0, Math.floor((length - 1) / 2), length - 1];

  return (
    <div className="xc-multi">
      <div
        className="xc-legend-chips"
        role="group"
        aria-label="Mostrar ou ocultar linhas"
      >
        {series.map((item) => (
          <button
            key={item.key}
            type="button"
            className="xc-chip"
            aria-pressed={!hidden.includes(item.key)}
            style={{ "--series": item.color } as CSSProperties}
            onClick={() =>
              setHidden((now) =>
                now.includes(item.key)
                  ? now.filter((key) => key !== item.key)
                  : [...now, item.key],
              )
            }
          >
            <i aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="xc-empty">Escolha pelo menos uma linha na legenda.</p>
      ) : (
        <div
          ref={ref}
          className="xc-trend-plot"
          tabIndex={0}
          role="group"
          aria-label={`${label}. Use as setas para ler cada dia.`}
          aria-describedby={`${id}-reading`}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerDown={(event: PointerEvent<HTMLDivElement>) =>
            setActive(
              indexAt(
                event.clientX,
                event.currentTarget.getBoundingClientRect(),
              ),
            )
          }
          onPointerMove={(event: PointerEvent<HTMLDivElement>) =>
            setActive(
              indexAt(
                event.clientX,
                event.currentTarget.getBoundingClientRect(),
              ),
            )
          }
          onPointerLeave={(event) =>
            event.pointerType === "mouse" && setActive(null)
          }
        >
          {width > 0 && (
            <>
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
                        <text
                          className="xc-axis"
                          x={-8}
                          y={y + 4}
                          textAnchor="end"
                        >
                          {formatAxis(tick)}
                        </text>
                      </g>
                    );
                  })}
                  {xs.map((index, position) => (
                    <text
                      key={index}
                      className="xc-axis"
                      x={geometry[0]?.current[index]?.x ?? 0}
                      y={innerH + 19}
                      textAnchor={
                        position === 0
                          ? "start"
                          : position === 2
                            ? "end"
                            : "middle"
                      }
                    >
                      {dayLabel(series[0].current[index].date)}
                    </text>
                  ))}
                  {geometry.map(({ item, current, previous }) => (
                    <g key={item.key} style={{ color: item.color }}>
                      {previous.length > 0 && (
                        <path
                          className="xc-multi-previous"
                          d={linePath(previous)}
                        />
                      )}
                      <path className="xc-multi-line" d={linePath(current)} />
                    </g>
                  ))}
                  {active !== null && (
                    <g>
                      <line
                        className="xc-cursor"
                        x1={cursorX}
                        x2={cursorX}
                        y1={0}
                        y2={innerH}
                      />
                      {geometry.map(({ item, current }) => (
                        <circle
                          key={item.key}
                          className="xc-multi-dot"
                          cx={current[active]?.x ?? 0}
                          cy={current[active]?.y ?? 0}
                          r={4.5}
                          style={{ fill: item.color }}
                        />
                      ))}
                    </g>
                  )}
                </g>
              </svg>
              {active !== null && (
                <div
                  className="xc-tip"
                  aria-hidden="true"
                  style={
                    compact
                      ? // Narrow screens: dock the tooltip in the corner away from the cursor.
                        {
                          top: margin.top,
                          ...(cursorX > innerW / 2
                            ? { left: margin.left + 4 }
                            : { right: margin.right }),
                        }
                      : {
                          left: margin.left + cursorX,
                          top: margin.top,
                          transform: flip
                            ? "translateX(calc(-100% - 12px))"
                            : "translateX(12px)",
                        }
                  }
                >
                  <strong>{fullDay(date)}</strong>
                  {visible.map((item) => (
                    <div key={item.key} className="xc-tip-row">
                      <i style={{ background: item.color }} />
                      <span>{item.label}</span>
                      <b>{format(item.current[active].value)}</b>
                      {compare && item.previous?.[active] && (
                        <small>
                          ant. {format(item.previous[active].value)}
                        </small>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      <p className="xc-reading" id={`${id}-reading`} aria-live="polite">
        <strong>{fullDay(date)}</strong>
        {visible.map((item) => (
          <span key={item.key} className="xc-reading-item">
            <i style={{ background: item.color }} aria-hidden="true" />
            {item.label}: <b>{format(item.current[shown].value)}</b>
            {compare && item.previous?.[shown] && (
              <small> (anterior {format(item.previous[shown].value)})</small>
            )}
          </span>
        ))}
      </p>
      <p className="xc-note">
        Linhas contínuas: período atual. Tracejadas: período anterior, alinhado
        por dia. {unit}
      </p>
    </div>
  );
}
