import { changeRatio } from "./account-model";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export { Composer, ComposerSection, ComposerSummary } from "./SupplierComposer";

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
