import type {
  OnrPortalOrdersInspection,
  OnrPreviewAttentionItem,
  OnrPreviewReviewHistory,
} from "./api";
import { OnrInspection } from "./OnrInspection";
import { OnrVersionHistory } from "./OnrVersionHistory";
import { dateTime } from "./onr-preview-format";
import {
  DECISION_OPTIONS,
  shortId,
  type ReviewDecision,
} from "./onr-review-model";
import { RolePicker } from "./RolePicker";
import type { ToastKind } from "./useToast";

export function OnrPreviewDetail({
  selected,
  inspection,
  history,
  inspectError,
  decision,
  busy,
  saveError,
  onBack,
  onInspect,
  onToast,
  onDecision,
  onReview,
}: {
  selected: OnrPreviewAttentionItem | null;
  inspection: OnrPortalOrdersInspection | null;
  history: OnrPreviewReviewHistory["items"] | null;
  inspectError: string;
  decision: ReviewDecision;
  busy: boolean;
  saveError: string;
  onBack: () => void;
  onInspect: (item: OnrPreviewAttentionItem) => void;
  onToast: (message: string, kind: ToastKind) => void;
  onDecision: (decision: ReviewDecision) => void;
  onReview: () => void;
}) {
  return (
    <div className="onr-rv-detail">
      {!selected ? (
        <div className="empty-state" role="status">
          <strong>Escolha uma tentativa</strong>
          <span>
            Selecione na fila para ver a listagem do portal e as revisões
            anteriores.
          </span>
        </div>
      ) : (
        <>
          <div className="onr-rv-detail-head">
            <button
              type="button"
              className="btn btn-ghost btn-sm onr-rv-back"
              onClick={onBack}
            >
              ← Voltar à fila
            </button>
            <h2 className="onr-rv-title">
              Tentativa <code>{shortId(selected.attempt_id)}</code>
            </h2>
            <p className="onr-rv-muted">
              Iniciada em {dateTime.format(new Date(selected.started_at))} ·
              pedido <code>{selected.operation_id}</code>
            </p>
          </div>

          {inspectError && (
            <div className="error-state" role="alert">
              <strong>Não foi possível ler o portal</strong>
              <span>{inspectError}</span>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => onInspect(selected)}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {!inspection && !inspectError && (
            <div
              className="rules-skeleton"
              role="status"
              aria-label="Lendo o portal"
            >
              <span className="skeleton" />
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          )}
          {inspection && (
            <OnrInspection
              key={inspection.listing_sha256}
              attemptId={selected.attempt_id}
              inspection={inspection}
              onStale={() => {
                onToast(
                  "A listagem do portal mudou. A inspeção foi recarregada.",
                  "error",
                );
                onInspect(selected);
              }}
              onCopy={(text) => {
                void navigator.clipboard?.writeText(text).then(
                  () => onToast("SHA-256 copiado.", "success"),
                  () => onToast("Não foi possível copiar.", "error"),
                );
              }}
            />
          )}

          <section className="onr-rv-block" aria-labelledby="onr-history-title">
            <h3 className="onr-rv-title" id="onr-history-title">
              Versões da revisão
            </h3>
            {history === null ? (
              <div
                className="rules-skeleton"
                role="status"
                aria-label="Carregando versões"
              >
                <span className="skeleton" />
              </div>
            ) : (
              <OnrVersionHistory
                items={history}
                currentSha={inspection?.listing_sha256 ?? null}
              />
            )}
          </section>

          {inspection && history !== null && (
            <section
              className="onr-rv-block"
              aria-labelledby="onr-decide-title"
            >
              <h3 className="onr-rv-title" id="onr-decide-title">
                {history.length ? "Corrigir a decisão" : "Registrar a decisão"}
              </h3>
              {saveError && (
                <p className="alert alert-danger" role="alert">
                  {saveError}
                </p>
              )}
              <RolePicker<ReviewDecision>
                label="O que você viu no portal"
                value={decision}
                options={DECISION_OPTIONS}
                disabled={busy}
                onChange={onDecision}
              />
              <div className="onr-rv-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  aria-haspopup="dialog"
                  disabled={busy}
                  onClick={onReview}
                >
                  Revisar e registrar
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
