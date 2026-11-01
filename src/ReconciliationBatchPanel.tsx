import { shortId } from "./reconciliation-format";
import type { UncertainRow } from "./reconciliation-model";

export function ReconciliationBatchPanel({
  rows,
  batchIds,
  batchBusy,
  selectedCount,
  batchResults,
  onToggle,
  onReview,
}: {
  rows: UncertainRow[];
  batchIds: string[];
  batchBusy: boolean;
  selectedCount: number;
  batchResults: string[];
  onToggle: (itemId: string) => void;
  onReview: () => void;
}) {
  return (
    <section className="rec-batch" aria-label="Conciliação em lote">
      <h2>Selecionar envios sem compra</h2>
      <p>
        Marque somente os envios que você conferiu individualmente no portal do
        fornecedor. Cada decisão é auditada e pode liberar uma nova tentativa
        automática para o pedido ativo.
      </p>
      <div className="rec-batch-list">
        {rows.map((row) => (
          <label key={row.item_id} className="rec-batch-row">
            <input
              type="checkbox"
              checked={batchIds.includes(row.item_id)}
              disabled={batchBusy}
              onChange={() => onToggle(row.item_id)}
            />
            <span>
              <strong>{shortId(row.operation_id)}</strong> · item{" "}
              {shortId(row.item_id)} · {row.provider}
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-md"
        disabled={selectedCount === 0 || batchBusy}
        onClick={() => onReview()}
      >
        Revisar {selectedCount} selecionado(s)
      </button>
      {batchResults.length > 0 && (
        <div className="alert alert-danger" role="alert">
          <strong>Alguns envios permaneceram na fila:</strong>
          <ul>
            {batchResults.map((result) => (
              <li key={result}>{result}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
