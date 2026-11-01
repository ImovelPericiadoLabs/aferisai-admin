import type { SupplierEvidence } from "./api";
import { ReconciliationEvidenceView } from "./ReconciliationEvidenceView";

export function ReconciliationEvidencePanel({
  reason,
  loading,
  error,
  evidence,
  onReasonChange,
  onLoad,
}: {
  reason: string;
  loading: boolean;
  error: string;
  evidence: SupplierEvidence | null;
  onReasonChange: (value: string) => void;
  onLoad: () => void;
}) {
  return (
    <section className="detail-panel-section">
      <h3 className="detail-panel-section-title">Resposta do fornecedor</h3>
      <p className="ops-lead">
        A leitura é restrita ao administrador e fica auditada. A consulta da
        lista de pedidos não reenvia a compra.
      </p>
      <div className="form-field ops-field">
        <label className="form-field-label" htmlFor="rec-evidence-reason">
          Motivo do acesso
        </label>
        <input
          id="rec-evidence-reason"
          className="input"
          value={reason}
          maxLength={500}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-md"
        disabled={loading || reason.trim().length < 10}
        onClick={() => onLoad()}
      >
        {loading ? "Consultando…" : "Ver resposta e pedidos"}
      </button>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {evidence && <ReconciliationEvidenceView evidence={evidence} />}
    </section>
  );
}
