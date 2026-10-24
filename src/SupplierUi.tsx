import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";

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

/** A centred dialog for forms and histories; the drawer stays visible behind it. */
export function FormModal({
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
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(open, ref, onClose);
  if (!open) return null;
  return createPortal(
    <div className="sup-modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="sup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sup-modal-head">
          <h3 id={titleId}>{title}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <div className="sup-modal-body">{children}</div>
        {footer && <footer className="sup-modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
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
