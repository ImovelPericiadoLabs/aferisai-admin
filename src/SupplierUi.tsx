import { changeRatio, type StepState } from "./account-model";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A small "?" that opens the explanation, so cards stay short. */
export function HelpTip({
  children,
  label = "Ajuda",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") {
          event.stopPropagation();
          setOpen(false);
        }
        return;
      }
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close, true);
    };
  }, [open]);

  return (
    <span className="sup-help" ref={ref}>
      <button
        type="button"
        className="sup-help-button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      {open && (
        <span className="sup-help-pop" id={id} role="note">
          {children}
        </span>
      )}
    </span>
  );
}

/** A form or history that opens in place, under the card that asked for it. */
export function InlinePanel({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open)
      ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);
  if (!open) return null;
  return (
    <section ref={ref} className="sup-inline" aria-labelledby={titleId}>
      <header className="sup-inline-head">
        <h3 id={titleId}>{title}</h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
        >
          Fechar
        </button>
      </header>
      <div className="sup-inline-body">{children}</div>
      {footer && <footer className="sup-inline-foot">{footer}</footer>}
    </section>
  );
}

/** A settings block: title, optional help and badge, actions on the right. */
export function SettingCard({
  title,
  help,
  badge,
  actions,
  children,
}: {
  title: string;
  help?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sup-card">
      <header className="sup-card-head">
        <div className="sup-card-title">
          <h3>{title}</h3>
          {help && <HelpTip>{help}</HelpTip>}
          {badge}
        </div>
        {actions && <div className="sup-card-actions">{actions}</div>}
      </header>
      <div className="sup-card-body">{children}</div>
    </section>
  );
}

/** Label/value pairs that never wrap the label. */
export function Metrics({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="sup-metrics">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "▲ 10%" against the previous version; nothing when there is no previous value. */
export function Delta({
  current,
  previous,
}: {
  current: number;
  previous: number | null | undefined;
}) {
  const ratio = changeRatio(current, previous ?? null);
  if (ratio === null || ratio === 0) return null;
  const up = ratio > 0;
  return (
    <span className="sup-delta" data-dir={up ? "up" : "down"}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Subiu" : "Caiu"}</span>
      {(Math.abs(ratio) / 100).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}
      %<small> vs. anterior</small>
    </span>
  );
}

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

/**
 * Hover (or focus, or tap) explanation for one item: a title, a plain-language explanation and an
 * example. It is drawn on the body so a scrolling table never clips it.
 */
export function Hint({
  title,
  body,
  example,
  children,
}: {
  title: string;
  body: string;
  example: string;
  children: ReactNode;
}) {
  const [box, setBox] = useState<{
    x: number;
    y: number;
    below: boolean;
  } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const id = useId();

  function show() {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const below = rect.bottom + 220 < window.innerHeight;
    setBox({
      x: Math.min(Math.max(8, rect.left), window.innerWidth - 336),
      y: below ? rect.bottom + 6 : rect.top - 6,
      below,
    });
  }
  const hide = () => setBox(null);

  useEffect(() => {
    if (!box) return;
    // Capture phase: Escape closes the balloon first and does not reach the drawer behind it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      hide();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", hide, true);
    };
  }, [box]);

  return (
    <span
      ref={anchor}
      className="sup-hint"
      tabIndex={0}
      aria-describedby={box ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={() => (box ? hide() : show())}
    >
      {children}
      {box &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className="sup-hint-pop"
            data-below={box.below ? "true" : "false"}
            style={{ left: box.x, top: box.y }}
          >
            <strong>{title}</strong>
            <span>{body}</span>
            <span className="sup-hint-example">
              <b>Exemplo</b> {example}
            </span>
          </span>,
          document.body,
        )}
    </span>
  );
}
