import { RolePicker } from "./RolePicker";
import { DECISIONS, type Decision } from "./reconciliation-model";

export function ReconciliationDecision({
  decision,
  protocol,
  submitted,
  error,
  saveError,
  busy,
  onDecision,
  onProtocol,
  onReview,
}: {
  decision: Decision;
  protocol: string;
  submitted: boolean;
  error: string | null;
  saveError: string;
  busy: boolean;
  onDecision: (next: Decision) => void;
  onProtocol: (value: string) => void;
  onReview: () => void;
}) {
  return (
    <section className="detail-panel-section">
      <h3 className="detail-panel-section-title">Decisão</h3>
      {saveError && (
        <p className="alert alert-danger" role="alert">
          {saveError}
        </p>
      )}
      <RolePicker<Decision>
        label="O que você verificou"
        value={decision}
        options={DECISIONS}
        disabled={busy}
        onChange={onDecision}
      />
      {decision === "protocol_confirmed" && (
        <div className="form-field ops-field">
          <label className="form-field-label" htmlFor="rec-protocol">
            Protocolo confirmado
          </label>
          <input
            id="rec-protocol"
            className="input"
            autoComplete="off"
            spellCheck={false}
            maxLength={160}
            placeholder="Número do protocolo no portal"
            value={protocol}
            disabled={busy}
            aria-invalid={submitted && error ? true : undefined}
            onChange={(event) => onProtocol(event.target.value)}
          />
          {submitted && error && (
            <span className="form-hint ops-error" role="alert">
              {error}
            </span>
          )}
        </div>
      )}
      <div className="ops-actions">
        <button
          type="button"
          className="btn btn-primary btn-md"
          aria-haspopup="dialog"
          disabled={busy}
          onClick={onReview}
        >
          Revisar e registrar
        </button>
      </div>
    </section>
  );
}
