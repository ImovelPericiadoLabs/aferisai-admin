import type { FormState } from "./commercial-model";

export function CommercialPolicyTermsFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
}) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <>
      <fieldset className="form-section">
        <legend className="form-section-title">Vigência</legend>
        <div className="form-row">
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-from">
              Início
            </label>
            <input
              id="policy-from"
              className="input"
              type="datetime-local"
              value={form.validFrom}
              required
              onChange={(event) => set("validFrom", event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-until">
              Fim
            </label>
            <input
              id="policy-until"
              className="input"
              type="datetime-local"
              value={form.validUntil}
              required
              onChange={(event) => set("validUntil", event.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend className="form-section-title">Condições</legend>
        <div className="form-row">
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-discount-pct">
              Desconto (%)
            </label>
            <input
              id="policy-discount-pct"
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.discountPercent}
              required
              onChange={(event) => set("discountPercent", event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-discount-brl">
              Desconto fixo (R$)
            </label>
            <input
              id="policy-discount-brl"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.discountReais}
              required
              onChange={(event) => set("discountReais", event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-commission-pct">
              Comissão (%)
            </label>
            <input
              id="policy-commission-pct"
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.commissionPercent}
              required
              onChange={(event) => set("commissionPercent", event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-commission-brl">
              Comissão fixa (R$)
            </label>
            <input
              id="policy-commission-brl"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.commissionReais}
              required
              onChange={(event) => set("commissionReais", event.target.value)}
            />
          </div>
        </div>
        <span className="form-hint">
          Percentual e valor fixo se somam. Use 0 quando não houver.
        </span>
      </fieldset>

      <fieldset className="form-section">
        <legend className="form-section-title">Justificativa</legend>
        <div className="form-field">
          <label className="form-field-label" htmlFor="policy-reason">
            Motivo
          </label>
          <textarea
            id="policy-reason"
            className="input"
            minLength={3}
            maxLength={500}
            value={form.reason}
            required
            onChange={(event) => set("reason", event.target.value)}
          />
          <span className="form-hint">
            Obrigatório. Fica registrado no histórico da regra.
          </span>
        </div>
      </fieldset>
    </>
  );
}
