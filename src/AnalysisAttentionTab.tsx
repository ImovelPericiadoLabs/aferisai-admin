import { attentionStatus } from "./analysis-review-model";
import type { AnalysisAttention } from "./useAnalysisAttention";

export function AnalysisAttentionTab({
  canReview,
  state,
}: {
  canReview: boolean;
  state: AnalysisAttention;
}) {
  const { attention, attentionError, attentionBusy, loadAttention } = state;
  return (
    <section className="review-card" aria-labelledby="attention-title">
      <div className="review-queue-heading">
        <div>
          <h2 id="attention-title">Exigem atenção</h2>
          <p className="review-help">
            Falhas, resultado externo incerto, suspensão financeira ou revisão
            desatualizada. A lista não reinicia trabalhos.
          </p>
        </div>
        {canReview && (
          <button
            type="button"
            className="button"
            disabled={attentionBusy}
            onClick={() => void loadAttention()}
          >
            Atualizar
          </button>
        )}
      </div>
      {!canReview ? (
        <p className="review-help">
          Seu papel não permite visualizar esta lista.
        </p>
      ) : (
        <>
          {attentionError && (
            <p role="alert" className="review-alert">
              {attentionError}
            </p>
          )}
          {attention &&
            (attention.items.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trabalho</th>
                    <th>Pedido</th>
                    <th>Status</th>
                    <th>Código de erro</th>
                    <th>Finalizado em</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.items.map((item) => {
                    const status = attentionStatus(item.status);
                    return (
                      <tr key={item.work_id}>
                        <td>
                          <code>{item.work_id.slice(0, 8)}</code>
                        </td>
                        <td>
                          <code>{item.request_id.slice(0, 8)}</code>
                        </td>
                        <td>
                          <span className={`pill ${status.className}`}>
                            {status.text}
                          </span>
                        </td>
                        <td>
                          <code>{item.error_code ?? "—"}</code>
                        </td>
                        <td>
                          {item.finished_at
                            ? new Date(item.finished_at).toLocaleString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="review-help">Nenhum trabalho nesta página.</p>
            ))}
          {attention?.next_cursor && (
            <button
              type="button"
              className="button"
              disabled={attentionBusy}
              onClick={() =>
                void loadAttention(attention.next_cursor ?? undefined)
              }
            >
              Próxima página
            </button>
          )}
        </>
      )}
    </section>
  );
}
