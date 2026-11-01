import type { SourceKind } from "./api";
import { itemLabel } from "./display-labels";
import type { SourceClassification } from "./useSourceClassification";

function SourceClassifyPanel({ state }: { state: SourceClassification }) {
  const {
    selectedSourceId,
    setSelectedSourceId,
    latestSourceDecision,
    sourceOriginalReason,
    setSourceOriginalReason,
    sourceOriginalUrl,
    sourceOriginalType,
    sourceKindForm,
    setSourceKindForm,
    sourceReasonForm,
    setSourceReasonForm,
    classifyBusy,
    classifyError,
    openSourceOriginal,
    submitClassify,
  } = state;
  if (!selectedSourceId) return null;
  return (
    <div className="review-classify-panel">
      <button
        type="button"
        className="button"
        onClick={() => setSelectedSourceId(null)}
      >
        ← Voltar
      </button>
      <p>
        Pedido <code>{selectedSourceId.slice(0, 8)}</code>
      </p>
      {latestSourceDecision?.decision && (
        <div className="review-existing-decision">
          <strong>Classificação atual:</strong>{" "}
          {itemLabel(latestSourceDecision.decision.source_kind)} —{" "}
          {latestSourceDecision.decision.reason}
        </div>
      )}
      {!sourceOriginalUrl && (
        <>
          <label className="review-label">
            Motivo da leitura (mínimo 10 caracteres)
            <textarea
              minLength={10}
              maxLength={500}
              value={sourceOriginalReason}
              onChange={(event) => setSourceOriginalReason(event.target.value)}
              placeholder="Ex.: verificar natureza do documento antes de classificar."
            />
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={classifyBusy || sourceOriginalReason.trim().length < 10}
            onClick={() => void openSourceOriginal()}
          >
            Abrir original
          </button>
        </>
      )}
      {sourceOriginalUrl && (
        <a
          href={sourceOriginalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button"
          type={sourceOriginalType || undefined}
        >
          Ver original aberto
        </a>
      )}
      {classifyError && (
        <p role="alert" className="review-alert">
          {classifyError}
        </p>
      )}
      <form className="form" onSubmit={(event) => void submitClassify(event)}>
        <label htmlFor="classify-kind">Natureza do original</label>
        <select
          id="classify-kind"
          value={sourceKindForm}
          onChange={(event) =>
            setSourceKindForm(event.target.value as SourceKind)
          }
        >
          <option value="unverified">Não verificada</option>
          <option value="third_party_report">Relatório derivado</option>
          <option value="registry_record">Documento registral</option>
        </select>
        <label htmlFor="classify-reason">
          Justificativa (mínimo 10 caracteres)
        </label>
        <textarea
          id="classify-reason"
          minLength={10}
          maxLength={500}
          value={sourceReasonForm}
          onChange={(event) => setSourceReasonForm(event.target.value)}
          required
        />
        {latestSourceDecision?.decision && (
          <p className="review-help">
            Corrigindo decisão{" "}
            <code>{latestSourceDecision.decision.id.slice(0, 8)}</code>
          </p>
        )}
        <button
          type="submit"
          className="button primary"
          disabled={classifyBusy || sourceReasonForm.trim().length < 10}
        >
          Classificar
        </button>
      </form>
    </div>
  );
}

export function AnalysisSourceTab({
  canReview,
  state,
}: {
  canReview: boolean;
  state: SourceClassification;
}) {
  const {
    sources,
    sourcesBusy,
    sourcesError,
    selectedSourceId,
    classifyDone,
    loadMoreSources,
    selectSource,
  } = state;
  return (
    <section className="review-card" aria-labelledby="tab-classify-title">
      <h2 id="tab-classify-title">Classificar fonte</h2>
      {!canReview ? (
        <p className="review-help">Seu papel não permite classificar fontes.</p>
      ) : (
        <>
          {sourcesError && (
            <p role="alert" className="review-alert">
              {sourcesError}
            </p>
          )}
          {classifyDone && (
            <p role="status" className="review-notice">
              {classifyDone}
            </p>
          )}
          {!sources && !sourcesError && (
            <div
              className="skeleton-rows"
              role="status"
              aria-label="Carregando"
            >
              {[1, 2].map((i) => (
                <div key={i} className="skeleton" style={{ height: "2rem" }} />
              ))}
            </div>
          )}
          {sources && !selectedSourceId && (
            <>
              {sources.items.length === 0 ? (
                <p className="review-help">
                  Nenhum pedido aguardando classificação.
                </p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Criado em</th>
                      <th>Expira em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.items.map((item) => (
                      <tr
                        key={item.request_id}
                        className="clickable-row"
                        onClick={() => void selectSource(item.request_id)}
                      >
                        <td>
                          <code>{item.request_id.slice(0, 8)}</code>
                        </td>
                        <td>
                          {new Date(item.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td>
                          {new Date(item.expires_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {sources.next_cursor && (
                <button
                  type="button"
                  className="button"
                  disabled={sourcesBusy}
                  onClick={() => loadMoreSources(sources.next_cursor ?? "")}
                >
                  Mais
                </button>
              )}
            </>
          )}
          <SourceClassifyPanel state={state} />
        </>
      )}
    </section>
  );
}
