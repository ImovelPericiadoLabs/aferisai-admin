import type { SourceDecision } from "./api";
import { sourceLabels } from "./source-classification-labels";

export function SourceBenchHeader({
  activeId,
  latest,
  onBack,
}: {
  activeId: string;
  latest: SourceDecision | null;
  onBack: () => void;
}) {
  return (
    <header className="ops-head">
      <div>
        <button
          type="button"
          className="btn btn-ghost btn-sm ops-back"
          onClick={onBack}
        >
          ← Voltar à fila
        </button>
        <h1 className="page-title" id="src-bench-title">
          Pedido <code>{activeId.slice(-8)}</code>
        </h1>
        <p className="page-subtitle">
          Abra o original, confira a natureza do documento e registre a decisão.
          A leitura fica auditada com o motivo.
        </p>
      </div>
      <div className="ops-head-actions">
        {latest ? (
          <span className="badge badge-info">
            {sourceLabels[latest.source_kind]} · revisão {latest.revision}
          </span>
        ) : (
          <span className="badge badge-warning">Sem decisão</span>
        )}
      </div>
    </header>
  );
}
