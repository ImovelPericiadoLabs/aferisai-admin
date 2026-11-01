import type { AnalysisReviewWork } from "./useAnalysisReviewWork";

export function AnalysisReviewQueue({ work }: { work: AnalysisReviewWork }) {
  const { queue, queueError, queueBusy, busy, loadQueue, loadById, setWorkId } =
    work;
  return (
    <section className="review-card" aria-labelledby="review-queue-title">
      <div className="review-queue-heading">
        <div>
          <h2 id="review-queue-title">Aguardando revisão</h2>
          <p className="review-help">
            Trabalhos pagos e vigentes sem decisão da equipe.
          </p>
        </div>
        <button
          type="button"
          className="button"
          disabled={queueBusy}
          onClick={() => void loadQueue()}
        >
          Atualizar
        </button>
      </div>
      {queueError && (
        <p role="alert" className="review-alert">
          {queueError}
        </p>
      )}
      {!queue && !queueError && (
        <div
          className="skeleton-rows"
          role="status"
          aria-label="Carregando fila"
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0",
              }}
            >
              <div style={{ display: "grid", gap: "0.4rem", flex: 1 }}>
                <div
                  className="skeleton"
                  style={{ height: "0.9rem", width: "65%" }}
                />
                <div
                  className="skeleton"
                  style={{ height: "0.75rem", width: "45%" }}
                />
              </div>
              <div
                className="skeleton"
                style={{
                  height: "36px",
                  width: "80px",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>
      )}
      {queue &&
        (queue.items.length ? (
          <ul className="review-queue-list">
            {queue.items.map((item) => (
              <li key={item.work_id}>
                <div>
                  <strong>Trabalho {item.work_id.slice(0, 8)}</strong>
                  <span>
                    Pedido {item.request_id.slice(0, 8)} · Concluído em{" "}
                    {new Date(item.completed_at).toLocaleString("pt-BR")}
                  </span>
                  <span>
                    Expira em{" "}
                    {new Date(item.expires_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    setWorkId(item.work_id);
                    void loadById(item.work_id);
                  }}
                >
                  Conferir
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="review-help">Nenhum trabalho nesta página.</p>
        ))}
      {queue?.next_cursor && (
        <button
          type="button"
          className="button"
          disabled={queueBusy}
          onClick={() => void loadQueue(queue.next_cursor ?? undefined)}
        >
          Próxima página
        </button>
      )}
    </section>
  );
}
