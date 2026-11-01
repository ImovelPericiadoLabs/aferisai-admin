import type { StepState } from "./account-model";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Create-a-version layout: progress on top, the sections of the form on the left (the finished
 * ones fold into a line, the current one stays open) and a live summary on the right.
 */
export function Composer({
  title,
  steps,
  onClose,
  summary,
  children,
}: {
  title: string;
  steps: { id: string; label: string; state: StepState }[];
  onClose: () => void;
  summary: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    // While a version is being created, the rest of the drawer steps aside.
    const layout = ref.current?.closest<HTMLElement>(".sup-ed-layout") ?? null;
    layout?.setAttribute("data-focus", "true");
    ref.current?.closest(".sup-ed-content")?.scrollTo({ top: 0 });
    return () => layout?.removeAttribute("data-focus");
  }, []);
  return (
    <section ref={ref} className="sup-composer" aria-labelledby={titleId}>
      <header className="sup-composer-head">
        <div>
          <h3 id={titleId}>{title}</h3>
          <ol className="sup-composer-steps" aria-label="Progresso">
            {steps.map((step, index) => (
              <li key={step.id} data-state={step.state}>
                <span aria-hidden="true">
                  {step.state === "done" ? "✓" : index + 1}
                </span>
                {step.label}
              </li>
            ))}
          </ol>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-md"
          onClick={onClose}
        >
          Cancelar e voltar
        </button>
      </header>
      <div className="sup-composer-body">
        <div className="sup-composer-form">{children}</div>
        <aside className="sup-composer-summary">{summary}</aside>
      </div>
    </section>
  );
}

/**
 * One block of the form. The current one is open; finished and upcoming ones fold into a
 * one-line recap (done in CSS, so a block never folds under the person's hands while they are
 * still typing inside it).
 */
export function ComposerSection({
  title,
  state,
  recap,
  children,
}: {
  title: string;
  state: StepState;
  /** What was filled in, shown when the section is folded. */
  recap?: ReactNode;
  children: ReactNode;
}) {
  // A manual toggle only counts for the step it was made in.
  const [manual, setManual] = useState<{
    state: StepState;
    open: boolean;
  } | null>(null);
  const forced = manual && manual.state === state ? manual.open : null;
  const open = forced ?? state === "current";
  return (
    <section className="sup-csection" data-state={state} data-open={open}>
      <button
        type="button"
        className="sup-csection-head"
        aria-expanded={open}
        onClick={() => setManual({ state, open: !open })}
      >
        <span className="sup-csection-title">{title}</span>
        {recap && <span className="sup-csection-recap">{recap}</span>}
        <span className="sup-csection-action" aria-hidden="true">
          {open ? "Recolher" : state === "done" ? "Editar" : "Abrir"}
        </span>
      </button>
      <div className="sup-csection-collapse">
        <div className="sup-csection-body">{children}</div>
      </div>
    </section>
  );
}

/** The live side of the form: what will be created, against what is current. */
export function ComposerSummary({
  title,
  total,
  delta,
  rows,
  footer,
}: {
  title: string;
  total?: ReactNode;
  delta?: ReactNode;
  rows: { label: string; value: ReactNode }[];
  footer: ReactNode;
}) {
  return (
    <div className="sup-csummary">
      <p className="sup-csummary-title">{title}</p>
      {total !== undefined && <p className="sup-csummary-total">{total}</p>}
      {delta && <p className="sup-csummary-delta">{delta}</p>}
      <dl className="sup-kv sup-kv-compact">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="sup-csummary-footer">{footer}</div>
    </div>
  );
}
