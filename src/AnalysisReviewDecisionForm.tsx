import type { ReviewPacket, SourceKind } from "./api";
import { flagLabels } from "./analysis-review-labels";
import { CitationFields } from "./AnalysisReviewEvidence";
import type { AnalysisReviewWork } from "./useAnalysisReviewWork";

export function AnalysisReviewDecisionForm({
  work,
  packet,
}: {
  work: AnalysisReviewWork;
  packet: ReviewPacket;
}) {
  const {
    outcome,
    setOutcome,
    sourceKind,
    setSourceKind,
    confirmedFlags,
    setConfirmedFlags,
    drafts,
    setDrafts,
    selectedCitationIndex,
    setSelectedCitationIndex,
    setPreviewPage,
    reviewStep,
    setReviewStep,
    originalStepRef,
    decisionReason,
    setDecisionReason,
    busy,
    decide,
  } = work;
  return (
    <form
      className={`review-card review-decision review-step-decision${reviewStep === "decision" ? " is-current" : ""}`}
      onSubmit={decide}
    >
      <h2>Decisão</h2>
      <p className="review-help">
        Cada decisão é imutável. Uma correção cria uma nova revisão e informa a
        última decisão automaticamente.
      </p>
      <fieldset>
        <legend>Resultado da conferência</legend>
        <label>
          <input
            type="radio"
            name="outcome"
            checked={outcome === "inconclusive"}
            onChange={() => setOutcome("inconclusive")}
          />{" "}
          Inconclusivo
        </label>
        <label>
          <input
            type="radio"
            name="outcome"
            checked={outcome === "approved"}
            onChange={() => setOutcome("approved")}
          />{" "}
          Aprovar pacote factual
        </label>
      </fieldset>
      <label className="review-label">
        Natureza do original
        <select
          value={sourceKind}
          onChange={(event) => setSourceKind(event.target.value as SourceKind)}
        >
          <option value="unverified">Não verificada</option>
          <option value="third_party_report">Relatório derivado</option>
          <option value="registry_record">Documento registral</option>
        </select>
      </label>
      {outcome === "approved" && (
        <fieldset>
          <legend>Flags técnicas confirmadas</legend>
          {packet.flags.map((flag) => (
            <label key={flag}>
              <input
                type="checkbox"
                checked={confirmedFlags.includes(flag)}
                onChange={(event) =>
                  setConfirmedFlags((current) =>
                    event.target.checked
                      ? [...current, flag]
                      : current.filter((value) => value !== flag),
                  )
                }
              />
              {flagLabels[flag] ?? flag}
            </label>
          ))}
        </fieldset>
      )}
      <h3>Citações</h3>
      <CitationFields
        packet={packet}
        drafts={drafts}
        onChange={(index, next) =>
          setDrafts((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index ? next : item,
            ),
          )
        }
        selectedIndex={selectedCitationIndex}
        onSelect={(index) => {
          setSelectedCitationIndex(index);
          setPreviewPage(packet.citation_checks[index].page);
          setReviewStep("original");
          if (window.matchMedia("(max-width: 640px)").matches)
            requestAnimationFrame(() => originalStepRef.current?.focus());
        }}
      />
      <label className="review-label">
        Motivo da decisão
        <textarea
          required
          minLength={10}
          maxLength={500}
          value={decisionReason}
          onChange={(event) => setDecisionReason(event.target.value)}
          placeholder="Explique a conclusão da conferência."
        />
      </label>
      <button className="button primary" disabled={busy} type="submit">
        Registrar decisão
      </button>
    </form>
  );
}
