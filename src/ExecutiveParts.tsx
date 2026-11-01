import { formatPercentBps } from "./executive-model";

export function Delta({ bps }: { bps: number | null }) {
  if (bps === null)
    return <span className="xe-delta xe-delta-none">sem comparação</span>;
  const up = bps >= 0;
  return (
    <span className={`xe-delta ${up ? "xe-delta-up" : "xe-delta-down"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Alta de" : "Queda de"}</span>
      {formatPercentBps(Math.abs(bps))}
      <small> vs. período anterior</small>
    </span>
  );
}

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card xe-section" aria-labelledby={id}>
      <div className="xe-section-head">
        <div>
          <h2 className="card-title" id={id}>
            {title}
          </h2>
          {description && <p className="xe-sub">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
