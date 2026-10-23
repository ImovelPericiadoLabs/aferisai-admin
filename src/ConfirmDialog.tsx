import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { validateReason } from "./reason";
import { useDialogFocus } from "./useDialogFocus";

type Props = {
  open: boolean;
  title: string;
  description?: ReactNode;
  details?: { label: string; value: ReactNode }[];
  reason?: { label: string; min: number; max: number };
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export function ConfirmDialog(props: Props) {
  if (!props.open) return null;
  return createPortal(<ConfirmDialogBody {...props} />, document.body);
}

function ConfirmDialogBody({
  title,
  description,
  details,
  reason,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [reasonText, setReasonText] = useState("");
  const check = reason
    ? validateReason(reasonText, reason.min, reason.max)
    : { ok: true, length: 0, message: "" };

  useDialogFocus(true, dialogRef, () => !busy && onCancel(), {
    initialFocus: () => cancelRef.current,
  });

  return (
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
        {reason && (
          <div className="confirm-reason">
            <label className="form-field-label" htmlFor={reasonId}>
              {reason.label}
            </label>
            <textarea
              id={reasonId}
              className="input"
              value={reasonText}
              maxLength={reason.max + 100}
              disabled={busy}
              aria-invalid={reasonText !== "" && !check.ok}
              onChange={(event) => setReasonText(event.target.value)}
            />
            <span
              className={`form-hint${reasonText !== "" && !check.ok ? " confirm-reason-error" : ""}`}
            >
              {reasonText !== "" && !check.ok
                ? check.message
                : `${check.length}/${reason.max} caracteres (mínimo ${reason.min}). Fica registrado no histórico.`}
            </span>
          </div>
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
            disabled={busy || !check.ok}
            onClick={(event) => {
              if (!event.nativeEvent.isTrusted) return;
              onConfirm(reasonText.trim());
            }}
          >
            {busy ? "Aguarde…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
