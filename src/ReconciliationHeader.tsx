import type { ReconciliationScope } from "./reconciliation-format";

export function ReconciliationHeader({
  scope,
  isAdmin,
  batchMode,
  loading,
  onToggleBatch,
  onRefresh,
  onChangeScope,
}: {
  scope: ReconciliationScope;
  isAdmin: boolean;
  batchMode: boolean;
  loading: boolean;
  onToggleBatch: () => void;
  onRefresh: () => void;
  onChangeScope: (next: ReconciliationScope) => void;
}) {
  return (
    <>
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">Operação</p>
          <h1 className="page-title" id="rec-title">
            Conciliação
          </h1>
          <p className="page-subtitle">
            {scope === "active"
              ? "Envios ao fornecedor cujo resultado não pôde ser confirmado. Cada item pede decisão auditada antes de qualquer nova tentativa."
              : "Pedidos reembolsados ficam aqui como registro técnico. O cliente não tem pagamento ou compra pendente; eventual custo do fornecedor é apurado separadamente."}
          </p>
        </div>
        <div className="ops-head-actions">
          {isAdmin && scope === "active" && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              aria-pressed={batchMode}
              onClick={onToggleBatch}
            >
              {batchMode ? "Fechar lote" : "Conciliar em lote"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={loading}
            onClick={onRefresh}
          >
            Atualizar
          </button>
        </div>
      </header>

      <div className="rules-toolbar">
        <div
          className="rules-tabs"
          role="group"
          aria-label="Situação da conciliação"
        >
          <button
            type="button"
            className="rules-tab"
            aria-pressed={scope === "active"}
            onClick={() => onChangeScope("active")}
          >
            Em atendimento
          </button>
          <button
            type="button"
            className="rules-tab"
            aria-pressed={scope === "refunded"}
            onClick={() => onChangeScope("refunded")}
          >
            Reembolsados
          </button>
        </div>
      </div>
    </>
  );
}
