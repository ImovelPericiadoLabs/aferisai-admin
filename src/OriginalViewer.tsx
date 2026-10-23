import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, openAnalysisOriginal } from "./api";
import { validateReason } from "./reason";
import { ReviewPage } from "./ReviewPage";
import { useDialogFocus } from "./useDialogFocus";
import "./review.css";
import "./original-viewer.css";

export type OriginalTarget = {
  requestId: string;
  title: string;
  facts: { label: string; value: string }[];
};

/** Opens one original through the audited endpoint, read-only (no marking). */
export function OriginalViewer({
  target,
  csrf,
  onClose,
  onUnauthorized,
  returnFocus,
}: {
  target: OriginalTarget | null;
  csrf: string;
  onClose: () => void;
  onUnauthorized: () => void;
  returnFocus?: () => HTMLElement | null;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const panelRef = useRef<HTMLElement>(null);
  const open = target !== null;
  const check = validateReason(reason, 10, 500);

  useDialogFocus(open, panelRef, () => !busy && onClose(), { returnFocus });

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  useEffect(() => {
    if (open) return;
    queueMicrotask(() => {
      setReason("");
      setError("");
      setUrl("");
      setType("");
      setPage(1);
    });
  }, [open]);

  async function openOriginal() {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      const blob = await openAnalysisOriginal(
        target.requestId,
        reason.trim(),
        csrf,
      );
      setType(blob.type);
      setUrl(URL.createObjectURL(blob));
      setPage(1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível abrir o original. Tente novamente.",
        );
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <>
      {open && (
        <div
          className="detail-panel-overlay"
          onClick={() => !busy && onClose()}
        />
      )}
      <aside
        ref={panelRef}
        className={`detail-panel ov-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ov-title"
        aria-hidden={!open}
      >
        {target && (
          <>
            <div className="detail-panel-header">
              <div>
                <h2 className="rules-panel-title" id="ov-title">
                  {target.title}
                </h2>
                <p className="rules-panel-sub">Leitura auditada do original</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                aria-label="Fechar"
                disabled={busy}
                onClick={onClose}
              >
                ✕
              </button>
            </div>
            <div className="detail-panel-body">
              <dl className="detail-panel-field">
                {target.facts.map((fact) => (
                  <Fragment key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </Fragment>
                ))}
              </dl>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              {!url ? (
                <div className="ov-reason">
                  <label className="form-field-label" htmlFor="ov-reason">
                    Motivo da leitura
                  </label>
                  <textarea
                    id="ov-reason"
                    className="input"
                    value={reason}
                    maxLength={600}
                    disabled={busy}
                    aria-invalid={reason !== "" && !check.ok}
                    placeholder="Ex.: entender por que a análise precisa de atenção."
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <span className="form-hint">
                    {reason !== "" && !check.ok
                      ? check.message
                      : "A abertura registra seu motivo antes de liberar o arquivo."}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="btn btn-primary btn-md"
                      disabled={busy || !check.ok}
                      onClick={() => void openOriginal()}
                    >
                      {busy ? "Abrindo…" : "Abrir original"}
                    </button>
                  </div>
                </div>
              ) : (
                <ReviewPage
                  key={url}
                  url={url}
                  mimeType={type}
                  page={page}
                  onPageChange={setPage}
                  selectedCitationPage={null}
                  box={null}
                  onBox={() => undefined}
                  helpText="Leitura somente para consulta. Nada é alterado nesta tela."
                />
              )}
            </div>
          </>
        )}
      </aside>
    </>,
    document.body,
  );
}
