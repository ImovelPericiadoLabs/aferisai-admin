import { limitFields } from "./analysis-provider-form-model";
import type { LimitsForm } from "./provider-model";

export function AnalysisProviderLimitsFieldset({
  limits,
  onChange,
}: {
  limits: LimitsForm;
  onChange: (next: LimitsForm) => void;
}) {
  return (
    <fieldset className="form-section">
      <legend className="form-section-title">Limites</legend>
      <div className="form-row">
        {limitFields.map(({ key, label: text, step }) => (
          <div className="form-field" key={key}>
            <label className="form-field-label" htmlFor={`new-${key}`}>
              {text}
            </label>
            <input
              id={`new-${key}`}
              className="input"
              type="number"
              step={step}
              min="0"
              required
              value={limits[key]}
              onChange={(event) =>
                onChange({ ...limits, [key]: event.target.value })
              }
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
