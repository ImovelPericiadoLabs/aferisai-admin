import { stepNames, type Step } from "./application-wizard-model";

export function ApplicationWizardProgress({
  step,
  busy,
  onStep,
}: {
  step: Step;
  busy: boolean;
  onStep: (step: Step) => void;
}) {
  return (
    <nav className="app-wizard-progress" aria-label="Etapas do cadastro">
      {stepNames.map((label, index) => (
        <button
          key={label}
          type="button"
          aria-current={step === index ? "step" : undefined}
          data-completed={index < step ? "true" : undefined}
          disabled={busy || index > step}
          onClick={() => onStep(index as Step)}
        >
          <span className="app-wizard-step-number" aria-hidden="true">
            {index + 1}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function ApplicationWizardActions({
  step,
  busy,
  attempt,
  onCancel,
  onBack,
  onNext,
}: {
  step: Step;
  busy: boolean;
  attempt: boolean;
  onCancel?: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="app-wizard-actions">
      <div>
        {onCancel && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
      </div>
      <div className="app-wizard-actions-right">
        {step > 0 && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => onBack()}
          >
            Voltar
          </button>
        )}
        {step < 3 ? (
          <button
            key="wizard-next"
            type="button"
            className="button primary"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              onNext();
            }}
          >
            Próximo <span aria-hidden="true">→</span>
          </button>
        ) : (
          <button
            key="wizard-save"
            type="submit"
            className="button primary"
            disabled={busy}
          >
            {busy
              ? "Salvando…"
              : attempt
                ? "Concluir cadastro"
                : "Criar aplicação"}
          </button>
        )}
      </div>
    </div>
  );
}
