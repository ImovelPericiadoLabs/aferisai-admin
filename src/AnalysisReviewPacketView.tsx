import type { ReviewPacket } from "./api";
import { draftBox, type CitationDraft } from "./analysis-review-model";
import { AnalysisReviewDecisionForm } from "./AnalysisReviewDecisionForm";
import { Findings } from "./AnalysisReviewEvidence";
import { ReviewPage } from "./ReviewPage";
import type { AnalysisReviewWork } from "./useAnalysisReviewWork";

export function AnalysisReviewPacketView({
  work,
  packet,
}: {
  work: AnalysisReviewWork;
  packet: ReviewPacket;
}) {
  const {
    reviewStep,
    setReviewStep,
    originalStepRef,
    decisionStepRef,
    originalReason,
    setOriginalReason,
    busy,
    openOriginal,
    previewUrl,
    previewType,
    previewPage,
    setPreviewPage,
    selectedCitationIndex,
    drafts,
    setDrafts,
  } = work;
  return (
    <>
      <section
        className="review-card review-summary"
        aria-label="Estado da revisão"
      >
        <div>
          <span>Solicitação</span>
          <strong>{packet.request_id}</strong>
        </div>
        <div>
          <span>Resultado técnico expira</span>
          <strong>{new Date(packet.expires_at).toLocaleString("pt-BR")}</strong>
        </div>
        <div>
          <span>Última decisão</span>
          <strong>
            {packet.latest_outcome === "approved"
              ? "Aprovada"
              : packet.latest_outcome === "inconclusive"
                ? "Inconclusiva"
                : "Aguardando revisão"}
          </strong>
        </div>
      </section>
      <div className="review-mobile-steps" aria-label="Etapas da revisão">
        <button
          ref={originalStepRef}
          type="button"
          aria-pressed={reviewStep === "original"}
          className={reviewStep === "original" ? "is-active" : ""}
          onClick={() => setReviewStep("original")}
        >
          <span>1</span> Original
        </button>
        <button
          ref={decisionStepRef}
          type="button"
          aria-pressed={reviewStep === "decision"}
          className={reviewStep === "decision" ? "is-active" : ""}
          onClick={() => setReviewStep("decision")}
        >
          <span>2</span> Decisão
        </button>
      </div>
      <div className="review-layout">
        <div
          className={`review-column review-step-original${reviewStep === "original" ? " is-current" : ""}`}
        >
          <section
            className="review-card"
            aria-labelledby="review-original-title"
          >
            <h2 id="review-original-title">Original</h2>
            <p className="review-help">
              A abertura registra seu motivo antes de liberar o arquivo.
            </p>
            <label className="review-label">
              Motivo da leitura
              <textarea
                minLength={10}
                maxLength={500}
                value={originalReason}
                onChange={(event) => setOriginalReason(event.target.value)}
                placeholder="Ex.: conferir as citações da análise preliminar."
              />
            </label>
            <button
              className="button secondary"
              type="button"
              disabled={busy || originalReason.trim().length < 10}
              onClick={openOriginal}
            >
              Abrir original auditado
            </button>
            {previewUrl && (
              <ReviewPage
                key={previewUrl}
                url={previewUrl}
                mimeType={previewType}
                page={previewPage}
                onPageChange={setPreviewPage}
                selectedCitationPage={
                  selectedCitationIndex === null
                    ? null
                    : (packet.citation_checks[selectedCitationIndex]?.page ??
                      null)
                }
                box={draftBox(drafts, selectedCitationIndex)}
                onBox={(box) => {
                  if (selectedCitationIndex === null) return;
                  setDrafts((current) =>
                    current.map((draft, index) =>
                      index === selectedCitationIndex
                        ? {
                            ...draft,
                            box: box.map(String) as CitationDraft["box"],
                          }
                        : draft,
                    ),
                  );
                }}
              />
            )}
          </section>
          <Findings packet={packet} />
          <button
            className="review-step-next"
            type="button"
            onClick={() => {
              setReviewStep("decision");
              requestAnimationFrame(() => decisionStepRef.current?.focus());
            }}
          >
            Ir para decisão <span aria-hidden="true">→</span>
          </button>
        </div>
        <AnalysisReviewDecisionForm work={work} packet={packet} />
      </div>
    </>
  );
}
