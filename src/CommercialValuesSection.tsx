import type {
  RegistryCommercialTerms as Terms,
  RegistryCommercialTermsCreate,
} from "./api";
import { ComposerSection } from "./SupplierUi";
import type { StepState } from "./account-model";
import type {
  CommercialErrors,
  CommercialLimits,
} from "./commercial-form-model";
import {
  commercialFields,
  displayNumber,
  money,
  unitHint,
  type NumericKey,
  type ShownError,
} from "./registry-commercial-terms-model";

export function CommercialValuesSection({
  state,
  draft,
  effective,
  numericInputs,
  limits,
  errors,
  shown,
  active,
  busy,
  analysisBudgetCents,
  economicAnalysisReserve,
  onNumericChange,
}: {
  state: StepState;
  draft: RegistryCommercialTermsCreate;
  effective: Terms;
  numericInputs: Record<NumericKey, string>;
  limits: CommercialLimits;
  errors: CommercialErrors;
  shown: ShownError;
  active: boolean;
  busy: boolean;
  analysisBudgetCents: number;
  economicAnalysisReserve: number | null;
  onNumericChange: (key: NumericKey, value: string) => void;
}) {
  return (
    <ComposerSection
      title="Valores"
      state={state}
      recap={`ONR ${(draft.onr_markup_bps / 100).toLocaleString("pt-BR")}% · tributos ${(draft.tax_rate_bps / 100).toLocaleString("pt-BR")}% · PIX ${money(draft.payment_fee_cents)}`}
    >
      {shown("values", true) && (
        <p className="sup-error sup-span" role="alert">
          {errors.values}
        </p>
      )}
      {commercialFields.map(({ key, label, unit }) => (
        <div key={key} className="sup-field">
          <label htmlFor={`cm-${key}`}>
            {label}{" "}
            <span className="sup-unit">
              {unitHint(key, unit, effective, limits)}
            </span>
          </label>
          <input
            className="input"
            id={`cm-${key}`}
            type="text"
            inputMode="decimal"
            value={numericInputs[key]}
            disabled={!active || busy}
            onChange={(event) => onNumericChange(key, event.target.value)}
          />
          {key === "analysis_call_reserve_cents" && (
            <div className="sup-analysis-field-note">
              <span>
                {effective.analysis_planned_calls} chamadas planejadas por
                documento · total atual {money(analysisBudgetCents)}.
              </span>
              {economicAnalysisReserve !== null ? (
                <button
                  type="button"
                  className="sup-mini"
                  disabled={!active || busy}
                  onClick={() =>
                    onNumericChange(key, displayNumber(economicAnalysisReserve))
                  }
                >
                  Sugerir {money(economicAnalysisReserve)}/chamada
                </button>
              ) : (
                <span>Já está no menor valor permitido pelo backend.</span>
              )}
            </div>
          )}
          {shown(key, true) ? (
            <small className="sup-error" role="alert">
              {shown(key, true)}
            </small>
          ) : (
            <small>
              {key.endsWith("bps")
                ? "Percentual da nova versão"
                : "Valor da nova versão"}
            </small>
          )}
        </div>
      ))}
    </ComposerSection>
  );
}
