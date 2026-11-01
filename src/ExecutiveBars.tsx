import type { ReactNode } from "react";
import { areaPath, linePath, pointsFor, shareBps } from "./chart-model";
import { formatPercentBps } from "./executive-model";

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
  if (rows.length === 0)
    return (
      <p className="xc-empty" role="status">
        Sem registros no período.
      </p>
    );
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
