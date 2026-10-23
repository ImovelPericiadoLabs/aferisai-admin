import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";

type Props = {
  open: boolean;
  title: string;
  description?: ReactNode;
  details?: { label: string; value: ReactNode }[];
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useDialogFocus(open, dialogRef, () => !busy && onCancel(), {
    initialFocus: () => cancelRef.current,
  });

  if (!open) return null;

  return createPortal(
    <div className="confirm-overlay" onClick={() => !busy && onCancel()}>
      <div
        ref={dialogRef}
        className="confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="confirm-title" id={titleId}>
          {title}
        </h2>
        {description && (
          <p className="confirm-description" id={descriptionId}>
            {description}
          </p>
        )}
        {details && details.length > 0 && (
          <dl className="confirm-details">
            {details.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="confirm-actions">
          <button
            ref={cancelRef}
            className="btn btn-secondary btn-md"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn btn-md ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
            type="button"
            disabled={busy}
            onClick={(event) => {
              if (!event.nativeEvent.isTrusted) return;
              onConfirm();
            }}
          >
            {busy ? "Aguarde…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
