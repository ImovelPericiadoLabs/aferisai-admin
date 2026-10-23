import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";
import "./secret-reveal.css";

type Props = {
  title: string;
  description: string;
  secretLabel: string;
  secret: string;
  details?: { label: string; value: string }[];
  onDismiss: () => void;
};

/** Shows a secret once. Esc and outside clicks do not dismiss it. */
export function SecretReveal({
  title,
  description,
  secretLabel,
  secret,
  details,
  onDismiss,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  useDialogFocus(true, dialogRef, () => undefined, {
    initialFocus: () => copyRef.current,
  });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  return createPortal(
    <div className="confirm-overlay">
      <div
        ref={dialogRef}
        className="confirm secret-reveal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="secret-reveal-title"
        aria-describedby="secret-reveal-description"
      >
        <h2 className="confirm-title" id="secret-reveal-title">
          {title}
        </h2>
        <p className="confirm-description" id="secret-reveal-description">
          {description}
        </p>
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
        <div className="secret-reveal-box">
          <span className="form-field-label" id="secret-reveal-label">
            {secretLabel}
          </span>
          <code aria-labelledby="secret-reveal-label">{secret}</code>
        </div>
        <p className="form-hint" role="status">
          {copied === "done"
            ? "Copiado para a área de transferência."
            : copied === "failed"
              ? "Não foi possível copiar. Selecione o texto e copie manualmente."
              : "Aparece uma única vez. Depois de fechar, não é possível ver de novo."}
        </p>
        <div className="confirm-actions">
          <button
            ref={copyRef}
            className="btn btn-secondary btn-md"
            type="button"
            onClick={() => void copy()}
          >
            Copiar
          </button>
          <button
            className="btn btn-primary btn-md"
            type="button"
            onClick={onDismiss}
          >
            Já guardei
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
