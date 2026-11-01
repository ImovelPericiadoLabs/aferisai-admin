import { ReconciliationTable } from "./ReconciliationTable";
import type { ReconciliationScope } from "./reconciliation-format";
import type { UncertainRow } from "./reconciliation-model";

export function ReconciliationList({
  listError,
  loading,
  itemCount,
  rows,
  scope,
  nextCursor,
  selectedKey,
  now,
  onLoad,
  onOpen,
}: {
  listError: string;
  loading: boolean;
  itemCount: number;
  rows: UncertainRow[];
  scope: ReconciliationScope;
  nextCursor: string | null;
  selectedKey: string | null;
  now: number;
  onLoad: (cursor?: string) => void;
  onOpen: (item: UncertainRow, element: HTMLElement) => void;
}) {
  return (
    <>
      {listError && (
        <div className="error-state" role="alert">
          <strong>Não foi possível carregar a fila</strong>
          <span>{listError}</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onLoad()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading && itemCount === 0 && !listError ? (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando fila"
        >
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : !listError && rows.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {scope === "active"
              ? "Nenhum envio incerto em atendimento"
              : "Nenhum registro de pedido reembolsado"}
          </strong>
          <span>
            {scope === "active"
              ? "Quando um envio ficar sem resposta clara, ele aparece aqui para decisão."
              : "Tentativas incertas de pedidos reembolsados aparecem aqui apenas para consulta."}
          </span>
        </div>
      ) : (
        <ReconciliationTable
          rows={rows}
          selectedKey={selectedKey}
          now={now}
          onOpen={onOpen}
        />
      )}

      <div className="ops-foot">
        <span>
          {rows.length}{" "}
          {scope === "refunded"
            ? rows.length === 1
              ? "registro"
              : "registros"
            : rows.length === 1
              ? "envio carregado"
              : "envios carregados"}
          <span className="ops-hint"> · J e K navegam, Enter abre</span>
        </span>
        {nextCursor && (
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={loading}
            onClick={() => onLoad(nextCursor)}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        )}
      </div>
    </>
  );
}
