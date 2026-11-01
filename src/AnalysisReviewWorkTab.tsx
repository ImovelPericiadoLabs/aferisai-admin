import { AnalysisReviewPacketView } from "./AnalysisReviewPacketView";
import { AnalysisReviewQueue } from "./AnalysisReviewQueue";
import type { AnalysisReviewWork } from "./useAnalysisReviewWork";

export function AnalysisReviewWorkTab({
  canReview,
  work,
}: {
  canReview: boolean;
  work: AnalysisReviewWork;
}) {
  const { workId, setWorkId, busy, error, notice, packet, load } = work;
  if (!canReview)
    return (
      <section className="review-card">
        <h2>Revisar análise</h2>
        <p className="review-help">
          Seu papel não permite abrir documentos ou decidir análises.
        </p>
      </section>
    );
  return (
    <>
      <AnalysisReviewQueue work={work} />
      <details className="advanced-lookup">
        <summary>Abrir por ID (para casos fora da fila)</summary>
        <form className="review-card review-lookup" onSubmit={load}>
          <label htmlFor="review-work-id">ID do trabalho</label>
          <div>
            <input
              id="review-work-id"
              type="text"
              required
              value={workId}
              onChange={(event) => setWorkId(event.target.value)}
              placeholder="UUIDv7 do trabalho concluído"
            />
            <button className="button primary" disabled={busy} type="submit">
              Consultar
            </button>
          </div>
          <small>Também é possível abrir um trabalho pelo ID.</small>
        </form>
      </details>
      {error && (
        <p className="review-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="review-notice" role="status">
          {notice}
        </p>
      )}
      {packet && <AnalysisReviewPacketView work={work} packet={packet} />}
    </>
  );
}
