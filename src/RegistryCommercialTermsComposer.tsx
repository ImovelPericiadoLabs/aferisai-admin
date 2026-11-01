import type { FormEvent } from "react";
import type {
  RegistryCommercialTerms as Terms,
  RegistryCommercialTermsCreate,
} from "./api";
import { Composer, ComposerSummary, Delta } from "./SupplierUi";
import type { StepState } from "./account-model";
import type {
  CommercialErrors,
  CommercialLimits,
} from "./commercial-form-model";
import { CommercialIdentitySection } from "./CommercialIdentitySection";
import { CommercialValuesSection } from "./CommercialValuesSection";
import {
  money,
  type NumericKey,
  type SetDraftField,
  type ShownError,
} from "./registry-commercial-terms-model";

export function RegistryCommercialTermsComposer({
  termStates,
  draft,
  effective,
  numericInputs,
  limits,
  errors,
  shown,
  active,
  busy,
  reviewing,
  attempted,
  error,
  feeChanged,
  evidenceNote,
  declaration,
  analysisBudgetCents,
  economicAnalysisReserve,
  set,
  onClose,
  onPublish,
  onCancelReview,
  onSubmit,
  onNumericChange,
  onSuggestVersion,
  onGenerateEvidence,
  onHashFile,
  onEvidenceNote,
}: {
  termStates: StepState[];
  draft: RegistryCommercialTermsCreate;
  effective: Terms;
  numericInputs: Record<NumericKey, string>;
  limits: CommercialLimits;
  errors: CommercialErrors;
  shown: ShownError;
  active: boolean;
  busy: boolean;
  reviewing: boolean;
  attempted: boolean;
  error: string;
  feeChanged: boolean;
  evidenceNote: string;
  declaration: { text: string; hash: string } | null;
  analysisBudgetCents: number;
  economicAnalysisReserve: number | null;
  set: SetDraftField;
  onClose: () => void;
  onPublish: () => void;
  onCancelReview: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNumericChange: (key: NumericKey, value: string) => void;
  onSuggestVersion: () => void;
  onGenerateEvidence: () => Promise<string | null>;
  onHashFile: (bytes: ArrayBuffer, name: string) => Promise<void>;
  onEvidenceNote: (note: string) => void;
}) {
  return (
    <Composer
      title="Nova versão comercial"
      steps={[
        { id: "values", label: "Valores", state: termStates[0] },
        {
          id: "identity",
          label: "Versão e evidência",
          state: termStates[1],
        },
        { id: "review", label: "Revisão", state: termStates[2] },
      ]}
      onClose={onClose}
      summary={
        <ComposerSummary
          title="Resumo da nova versão"
          rows={[
            {
              label: "Margem ONR",
              value: (
                <>
                  {(draft.onr_markup_bps / 100).toLocaleString("pt-BR")}%{" "}
                  <Delta
                    current={draft.onr_markup_bps}
                    previous={effective.onr_markup_bps}
                  />
                </>
              ),
            },
            {
              label: "Tributos",
              value: (
                <>
                  {(draft.tax_rate_bps / 100).toLocaleString("pt-BR")}%{" "}
                  <Delta
                    current={draft.tax_rate_bps}
                    previous={effective.tax_rate_bps}
                  />
                </>
              ),
            },
            {
              label: "Tarifa PIX",
              value: (
                <>
                  {money(draft.payment_fee_cents)}{" "}
                  <Delta
                    current={draft.payment_fee_cents}
                    previous={effective.payment_fee_cents}
                  />
                </>
              ),
            },
            {
              label: "Contribuição mínima",
              value: money(draft.minimum_contribution_cents),
            },
            {
              label: "Reserva de IA",
              value: `${money(analysisBudgetCents)} por documento (${effective.analysis_planned_calls} chamadas)`,
            },
            { label: "Versão", value: draft.version.trim() || "—" },
          ]}
          footer={
            reviewing ? (
              <div
                className="sup-review"
                role="group"
                aria-label="Confirmar versão comercial"
              >
                <p>
                  Publicar <strong>{draft.version.trim()}</strong>: ONR{" "}
                  {(draft.onr_markup_bps / 100).toLocaleString("pt-BR")}% ·
                  tributos {(draft.tax_rate_bps / 100).toLocaleString("pt-BR")}%
                  · PIX {money(draft.payment_fee_cents)} · IA{" "}
                  {money(analysisBudgetCents)} por documento.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  disabled={busy}
                  onClick={onPublish}
                >
                  {busy ? "Publicando…" : "Confirmar publicação"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  disabled={busy}
                  onClick={onCancelReview}
                >
                  Voltar
                </button>
              </div>
            ) : (
              <button
                type="submit"
                form="commercial-form"
                className="btn btn-primary btn-md"
                disabled={!active || busy}
              >
                Revisar publicação
              </button>
            )
          }
        />
      }
    >
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {attempted && Object.keys(errors).length > 0 && (
        <p className="alert alert-danger" role="alert">
          Há {Object.keys(errors).length}{" "}
          {Object.keys(errors).length === 1 ? "campo" : "campos"} para corrigir,
          destacados abaixo.
        </p>
      )}
      <form
        id="commercial-form"
        className="sup-composer-form"
        onSubmit={onSubmit}
        noValidate
      >
        <CommercialValuesSection
          state={termStates[0]}
          draft={draft}
          effective={effective}
          numericInputs={numericInputs}
          limits={limits}
          errors={errors}
          shown={shown}
          active={active}
          busy={busy}
          analysisBudgetCents={analysisBudgetCents}
          economicAnalysisReserve={economicAnalysisReserve}
          onNumericChange={onNumericChange}
        />
        <CommercialIdentitySection
          state={termStates[1]}
          draft={draft}
          errors={errors}
          shown={shown}
          active={active}
          busy={busy}
          feeChanged={feeChanged}
          evidenceNote={evidenceNote}
          declaration={declaration}
          onSuggestVersion={onSuggestVersion}
          onGenerateEvidence={onGenerateEvidence}
          onHashFile={onHashFile}
          onEvidenceNote={onEvidenceNote}
          set={set}
        />
      </form>
    </Composer>
  );
}
