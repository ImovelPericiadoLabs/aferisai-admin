import { docStateBadge, docStateLabel } from "./analysis-review-labels";
import { analysisWorkStatusLabel, statusLabel } from "./display-labels";
import type { AnalysisRequests } from "./useAnalysisRequests";

export function AnalysisRequestsTab({ state }: { state: AnalysisRequests }) {
  const { requests, requestsBusy, requestsError, loadMoreRequests } = state;
  return (
    <section className="review-card" aria-labelledby="tab-requests-title">
      <h2 id="tab-requests-title">Pedidos de análise</h2>
      {requestsError && (
        <p role="alert" className="review-alert">
          {requestsError}
        </p>
      )}
      {!requests && !requestsError && (
        <div className="skeleton-rows" role="status" aria-label="Carregando">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: "2rem" }} />
          ))}
        </div>
      )}
      {requests && (
        <>
          {requests.items.length === 0 ? (
            <p className="review-help">Nenhum pedido registrado.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Páginas</th>
                  <th>Documento</th>
                  <th>Pagamento</th>
                  <th>Trabalho</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {requests.items.map((item) => (
                  <tr key={item.request_id}>
                    <td>
                      <code>{item.request_id.slice(0, 8)}</code>
                    </td>
                    <td>{item.page_count}</td>
                    <td>
                      <span
                        className={`pill ${docStateBadge[item.document_state] ?? "badge-gray"}`}
                      >
                        {docStateLabel[item.document_state] ??
                          statusLabel(item.document_state)}
                      </span>
                    </td>
                    <td>
                      {item.payment_status ? (
                        <span className="pill badge-gray">
                          {statusLabel(item.payment_status)}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {item.work_status ? (
                        <span className="pill badge-blue">
                          {analysisWorkStatusLabel(item.work_status)}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{new Date(item.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {requests.next_cursor && (
            <button
              type="button"
              className="button"
              disabled={requestsBusy}
              onClick={() => void loadMoreRequests()}
            >
              Mais
            </button>
          )}
        </>
      )}
    </section>
  );
}
