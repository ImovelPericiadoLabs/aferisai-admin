import { ReviewPage } from "./ReviewPage";

export function SourceOriginalColumn({
  current,
  busy,
  readReason,
  previewUrl,
  previewType,
  page,
  onReadReason,
  onOpenOriginal,
  onGoToDecision,
  onPageChange,
}: {
  current: boolean;
  busy: boolean;
  readReason: string;
  previewUrl: string;
  previewType: string;
  page: number;
  onReadReason: (value: string) => void;
  onOpenOriginal: () => void;
  onGoToDecision: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="ops-bench-col" data-current={current ? "true" : undefined}>
      <section className="ops-block" aria-labelledby="source-original-title">
        <h2 className="ops-block-title" id="source-original-title">
          Original
        </h2>
        <p className="ops-lead">
          A API registra o motivo antes de entregar o arquivo. Confira as
          páginas necessárias para identificar a natureza da fonte.
        </p>
        <div className="form-field">
          <label className="form-field-label" htmlFor="source-read-reason">
            Motivo da leitura
          </label>
          <textarea
            id="source-read-reason"
            className="input"
            minLength={10}
            maxLength={500}
            value={readReason}
            onChange={(event) => onReadReason(event.target.value)}
            placeholder="Explique por que precisa conferir o original."
          />
          <span className="form-hint">
            {readReason.trim().length}/500 (mínimo 10)
          </span>
        </div>
        <div className="ops-actions">
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={busy || readReason.trim().length < 10}
            onClick={() => onOpenOriginal()}
          >
            {busy ? "Aguarde…" : "Abrir original auditado"}
          </button>
          <button
            className="btn btn-ghost btn-md ops-bench-next"
            type="button"
            onClick={onGoToDecision}
          >
            Ir para a decisão →
          </button>
        </div>
        {previewUrl && (
          <ReviewPage
            key={previewUrl}
            url={previewUrl}
            mimeType={previewType}
            page={page}
            onPageChange={onPageChange}
            selectedCitationPage={null}
            box={null}
            onBox={() => undefined}
            helpText="Leia o original antes de registrar a natureza da fonte."
          />
        )}
      </section>
    </div>
  );
}
