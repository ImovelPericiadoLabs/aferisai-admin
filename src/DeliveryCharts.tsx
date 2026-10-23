import { useMemo, useState } from "react";
import type { WebhookDelivery } from "./api";
import {
  bucketDeliveries,
  latencySeries,
  type DayBucket,
  type LatencyPoint,
} from "./integration-insights-model";
import { deliveryLabel } from "./delivery-labels";

const W = 560;
const H = 150;
const PAD = { left: 34, right: 8, top: 10, bottom: 22 };

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const rounded = Math.ceil(value / magnitude) * magnitude;
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

function DaysChart({
  buckets,
  loaded,
  note,
}: {
  buckets: DayBucket[];
  loaded: number;
  note: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...buckets.map((b) => b.total), 1));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / buckets.length;
  const barW = Math.min(26, slot * 0.62);
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const shown = active !== null ? buckets[active] : null;
  const total = buckets.reduce((sum, b) => sum + b.total, 0);

  return (
    <figure className="dchart-card card">
      <figcaption>
        <strong>Entregas por dia</strong>
        <span>
          {shown
            ? `${shown.label} · ${shown.delivered} entregues · ${shown.problems} com problema${shown.other ? ` · ${shown.other} outras` : ""}`
            : `${total} de ${loaded} carregadas, em ${buckets.length} dias${note}`}
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>
          Entregas por dia entre as {loaded} carregadas{note}
        </caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Entregues</th>
            <th scope="col">Com problema</th>
            <th scope="col">Outras</th>
          </tr>
        </thead>
        <tbody>
          {buckets
            .filter((bucket) => bucket.total > 0)
            .map((bucket) => (
              <tr key={bucket.key}>
                <th scope="row">{bucket.label}</th>
                <td>{bucket.delivered}</td>
                <td>{bucket.problems}</td>
                <td>{bucket.other}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              className="dchart-grid"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(max * fraction)}
              y2={y(max * fraction)}
            />
            <text
              className="dchart-tick"
              x={PAD.left - 6}
              y={y(max * fraction) + 3}
              textAnchor="end"
            >
              {Math.round(max * fraction)}
            </text>
          </g>
        ))}
        {buckets.map((bucket, index) => {
          const x = PAD.left + slot * index + (slot - barW) / 2;
          const parts = [
            { cls: "ok", value: bucket.delivered },
            { cls: "bad", value: bucket.problems },
            { cls: "other", value: bucket.other },
          ];
          let acc = 0;
          return (
            <g
              key={bucket.key}
              className="dchart-col"
              data-active={active === index}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            >
              <rect
                className="dchart-hit"
                x={PAD.left + slot * index}
                y={PAD.top}
                width={slot}
                height={innerH}
              />
              {parts.map((part) => {
                if (!part.value) return null;
                const top = y(acc + part.value);
                const height = y(acc) - top;
                acc += part.value;
                return (
                  <rect
                    key={part.cls}
                    className={`dchart-bar ${part.cls}`}
                    x={x}
                    y={top}
                    width={barW}
                    height={Math.max(2, height)}
                    rx={2}
                    style={{ animationDelay: `${index * 30}ms` }}
                  />
                );
              })}
              {(index % 2 === 0 || buckets.length <= 8) && (
                <text
                  className="dchart-tick"
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                >
                  {bucket.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="dchart-legend" aria-hidden="true">
        <span className="ok">Entregues</span>
        <span className="bad">Com problema</span>
        <span className="other">Outras</span>
      </div>
    </figure>
  );
}

function LatencyChart({ points }: { points: LatencyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.ms), 1));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left +
    (points.length === 1 ? innerW / 2 : (innerW * index) / (points.length - 1));
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.ms)}`)
    .join(" ");
  const area = points.length
    ? `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
    : "";
  const shown = active !== null ? points[active] : null;
  const average = points.length
    ? Math.round(points.reduce((sum, p) => sum + p.ms, 0) / points.length)
    : null;

  return (
    <figure className="dchart-card card">
      <figcaption>
        <strong>Latência</strong>
        <span>
          {shown
            ? `${shown.ms} ms · ${deliveryLabel(shown.status)}`
            : average !== null
              ? `${average} ms de média nas últimas ${points.length}`
              : "Sem medições"}
        </span>
      </figcaption>
      {points.length === 0 ? (
        <div className="dchart-empty">
          As medições aparecem quando há entregas com duração registrada.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Latência das últimas entregas"
        >
          {[0, 0.5, 1].map((fraction) => (
            <g key={fraction}>
              <line
                className="dchart-grid"
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(max * fraction)}
                y2={y(max * fraction)}
              />
              <text
                className="dchart-tick"
                x={PAD.left - 6}
                y={y(max * fraction) + 3}
                textAnchor="end"
              >
                {Math.round(max * fraction)}
              </text>
            </g>
          ))}
          <path className="dchart-area" d={area} />
          <path className="dchart-line" d={line} pathLength={1} />
          {points.map((point, index) => (
            <circle
              key={point.id}
              className={`dchart-dot ${point.status === "delivered" ? "ok" : point.status === "attempted" || point.status === "unknown" ? "bad" : "other"}`}
              cx={x(index)}
              cy={y(point.ms)}
              r={active === index ? 5 : 3.5}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
      )}
    </figure>
  );
}

export function DeliveryCharts({
  items,
  now,
  note = "",
}: {
  items: WebhookDelivery[];
  now?: number;
  /** Extra scope shown to the reader, e.g. " (filtro: Falhas)". */
  note?: string;
}) {
  const buckets = useMemo(() => bucketDeliveries(items, 14, now), [items, now]);
  const points = useMemo(() => latencySeries(items, 30), [items]);
  return (
    <div className="dchart">
      <DaysChart buckets={buckets} loaded={items.length} note={note} />
      <LatencyChart points={points} />
    </div>
  );
}
