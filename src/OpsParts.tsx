import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ageLabel, ageTone, type AgeTone } from "./ops-model";
import { useDialogFocus } from "./useDialogFocus";

export type Kpi = {
  id: string;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "danger" | "warning" | "success";
};

/** Clickable summary tiles; the active one filters the list. */
export function OpsKpis({
  items,
  active,
  onPick,
}: {
  items: Kpi[];
  active: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <div className="ops-kpis" role="group" aria-label="Indicadores">
      {items.map((kpi) => (
        <button
          key={kpi.id}
          type="button"
          className="ops-kpi"
          data-tone={kpi.tone}
          aria-pressed={active === kpi.id}
          onClick={() => onPick(active === kpi.id ? null : kpi.id)}
        >
          <span className="ops-kpi-label">{kpi.label}</span>
          <strong className="ops-kpi-value">{kpi.value}</strong>
          {kpi.hint && <span className="ops-kpi-hint">{kpi.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/** Saved views as scrollable tabs with counts. */
export function OpsViews({
  views,
  active,
  onPick,
  label,
}: {
  views: { id: string; label: string; count: number }[];
  active: string;
  onPick: (id: string) => void;
  label: string;
}) {
  return (
    <div className="ops-views" role="group" aria-label={label}>
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          className="ops-view"
          aria-pressed={active === view.id}
          onClick={() => onPick(view.id)}
        >
          {view.label}
          <span className="ops-view-count">{view.count}</span>
        </button>
      ))}
    </div>
  );
}

export function AgeBadge({
  iso,
  now,
  warnAfterHours = 24,
  dangerAfterHours = 72,
}: {
  iso: string;
  now: number;
  warnAfterHours?: number;
  dangerAfterHours?: number;
}) {
  const tone: AgeTone = ageTone(iso, now, warnAfterHours, dangerAfterHours);
  return (
    <span
      className="ops-age"
      data-tone={tone}
      title={new Date(iso).toLocaleString("pt-BR")}
    >
      {ageLabel(iso, now)}
    </span>
  );
}

export type TimelineStep = {
  title: string;
  detail?: string;
  at?: string;
  state: "done" | "current" | "todo" | "error";
};

export function OpsTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="ops-timeline" aria-label="Linha do tempo">
      {steps.map((step) => (
        <li key={step.title} data-state={step.state}>
          <span className="ops-timeline-dot" aria-hidden="true" />
          <div>
            <strong>{step.title}</strong>
            {step.at && <small>{step.at}</small>}
            {step.detail && <p>{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Right drawer on desktop, full screen with a back button on the phone. */
export function RecordDrawer({
  open,
  title,
  subtitle,
  badges,
  onClose,
  returnFocus,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  onClose: () => void;
  returnFocus: () => HTMLElement | null | undefined;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useDialogFocus(open, ref, onClose, { returnFocus });
  return createPortal(
    <>
      {open && <div className="detail-panel-overlay" onClick={onClose} />}
      <aside
        ref={ref}
        className={`detail-panel ops-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
      >
        {open && (
          <>
            <div className="detail-panel-header">
              <button
                type="button"
                className="btn btn-ghost btn-sm ops-drawer-back"
                onClick={onClose}
              >
                ← Voltar
              </button>
              <div className="ops-drawer-title">
                <h2 className="prov-title">{title}</h2>
                {subtitle && <p className="prov-sub">{subtitle}</p>}
                {badges && <div className="ops-drawer-badges">{badges}</div>}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm ops-drawer-close"
                aria-label="Fechar"
                onClick={onClose}
              >
                ✕
              </button>
            </div>
            <div className="detail-panel-body">{children}</div>
          </>
        )}
      </aside>
    </>,
    document.body,
  );
}

/** Bottom sheet for the phone filters. */
export function BottomSheet({
  open,
  title,
  onClose,
  returnFocus,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  returnFocus: () => HTMLElement | null | undefined;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(open, ref, onClose, { returnFocus });
  if (!open) return null;
  return createPortal(
    <div className="ops-sheet-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="ops-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ops-sheet-grip" aria-hidden="true" />
        <h2 className="ops-sheet-title">{title}</h2>
        <div className="ops-sheet-body">{children}</div>
        {footer && <div className="ops-sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
