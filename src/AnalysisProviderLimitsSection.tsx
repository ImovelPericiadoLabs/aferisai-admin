import type { AnalysisProviderAccount } from "./api";
import {
  formToLimits,
  formatCostPerDay,
  type LimitsForm,
} from "./provider-model";

const limitFields: { key: keyof LimitsForm; label: string; step: string }[] = [
  { key: "maxConcurrent", label: "Chamadas simultâneas", step: "1" },
  { key: "dailyLimit", label: "Chamadas por dia", step: "1" },
  { key: "rpm", label: "Requisições por minuto", step: "1" },
  { key: "tpm", label: "Tokens por minuto", step: "1" },
  { key: "dailyCostReais", label: "Teto diário (R$)", step: "0.01" },
  { key: "priority", label: "Prioridade (menor vem primeiro)", step: "1" },
];

export function AnalysisProviderLimitsSection({
  account,
  editable,
  form,
  parsed,
  busy,
  onForm,
  onSave,
}: {
  account: AnalysisProviderAccount;
  editable: boolean;
  form: LimitsForm;
  parsed: ReturnType<typeof formToLimits>;
  busy: boolean;
  onForm: (form: LimitsForm) => void;
  onSave: () => void;
}) {
  return (
    <section className="detail-panel-section">
      <h3 className="detail-panel-section-title">Limites</h3>
      {editable ? (
        <>
          <div className="form-row">
            {limitFields.map(({ key, label, step }) => (
              <div className="form-field" key={key}>
                <label className="form-field-label" htmlFor={`prov-${key}`}>
                  {label}
                </label>
                <input
                  id={`prov-${key}`}
                  className="input"
                  type="number"
                  step={step}
                  min="0"
                  value={form[key]}
                  aria-invalid={!parsed.ok && parsed.field === key}
                  onChange={(event) =>
                    onForm({ ...form, [key]: event.target.value })
                  }
                />
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary btn-md prov-action"
            type="button"
            disabled={busy}
            onClick={onSave}
          >
            Salvar limites
          </button>
        </>
      ) : (
        <dl className="detail-panel-field">
          <dt>Chamadas simultâneas</dt>
          <dd>{account.max_concurrent}</dd>
          <dt>Chamadas por dia</dt>
          <dd>{account.daily_limit}</dd>
          <dt>Requisições por minuto</dt>
          <dd>{account.rpm}</dd>
          <dt>Tokens por minuto</dt>
          <dd>{account.tpm}</dd>
          <dt>Teto diário</dt>
          <dd>{formatCostPerDay(account.daily_cost_cents)}</dd>
          <dt>Prioridade</dt>
          <dd>{account.priority}</dd>
        </dl>
      )}
    </section>
  );
}
