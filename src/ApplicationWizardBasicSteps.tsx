import type { Dispatch, SetStateAction } from "react";

export function ApplicationWizardBasicsStep({
  id,
  name,
  organizationName,
  busy,
  locked,
  fieldError,
  onName,
}: {
  id: string;
  name: string;
  organizationName: string;
  busy: boolean;
  locked: boolean;
  fieldError: string;
  onName: (value: string) => void;
}) {
  return (
    <div className="app-wizard-section">
      <div className="app-wizard-section-heading">
        <h4>Dados básicos</h4>
        <p>Identifique a aplicação dentro de {organizationName}.</p>
      </div>
      <div className="app-wizard-grid">
        <div className="app-wizard-field">
          <label htmlFor={`${id}-name`}>
            Nome da aplicação <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${id}-name`}
            value={name}
            maxLength={255}
            disabled={busy || locked}
            autoComplete="off"
            placeholder="Ex.: Portal de documentos"
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? `${id}-name-error` : undefined}
            onChange={(event) => {
              onName(event.target.value);
            }}
          />
          {fieldError && (
            <small
              id={`${id}-name-error`}
              className="app-wizard-field-error"
              role="alert"
            >
              {fieldError}
            </small>
          )}
          <small>Use um nome que sua equipe reconheça facilmente.</small>
        </div>
        <div className="app-wizard-fact">
          <span>Empresa responsável</span>
          <strong>{organizationName}</strong>
          <small>A aplicação ficará vinculada a esta empresa.</small>
        </div>
      </div>
    </div>
  );
}

export function ApplicationWizardIntegrationStep({
  id,
  busy,
  callbackInput,
  callbackError,
  callbacks,
  onCallbackInput,
  onAddCallback,
  setCallbacks,
}: {
  id: string;
  busy: boolean;
  callbackInput: string;
  callbackError: string;
  callbacks: string[];
  onCallbackInput: (value: string) => void;
  onAddCallback: () => void;
  setCallbacks: Dispatch<SetStateAction<string[]>>;
}) {
  return (
    <div className="app-wizard-section">
      <div className="app-wizard-section-heading">
        <h4>Integração</h4>
        <p>
          Adicione os retornos OAuth necessários. O webhook é configurado após
          criar a aplicação, com chave e teste assinado.
        </p>
      </div>
      <div className="app-wizard-field app-wizard-callback-field">
        <label htmlFor={`${id}-callback`}>
          URL de retorno OAuth{" "}
          <span className="app-wizard-optional">Opcional</span>
        </label>
        <div className="app-wizard-input-action">
          <input
            id={`${id}-callback`}
            type="url"
            inputMode="url"
            value={callbackInput}
            placeholder="https://suaempresa.com/oauth/callback"
            aria-invalid={Boolean(callbackError)}
            aria-describedby={
              callbackError ? `${id}-callback-error` : `${id}-callback-help`
            }
            onChange={(event) => {
              onCallbackInput(event.target.value);
            }}
          />
          <button
            type="button"
            className="button secondary"
            disabled={!callbackInput.trim() || busy}
            onClick={onAddCallback}
          >
            Adicionar
          </button>
        </div>
        {callbackError ? (
          <small
            id={`${id}-callback-error`}
            className="app-wizard-field-error"
            role="alert"
          >
            {callbackError}
          </small>
        ) : (
          <small id={`${id}-callback-help`}>
            Até 5 URLs HTTPS exatas, sem parâmetros ou fragmentos.
          </small>
        )}
      </div>
      {callbacks.length > 0 && (
        <ul
          className="app-wizard-callbacks"
          aria-label="URLs de retorno adicionadas"
        >
          {callbacks.map((callback) => (
            <li key={callback}>
              <span>{callback}</span>
              <button
                type="button"
                onClick={() =>
                  setCallbacks((items) =>
                    items.filter((item) => item !== callback),
                  )
                }
                aria-label={`Remover ${callback}`}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="app-wizard-inline-note">
        Webhook: endereço, assinatura e evento de teste serão configurados na
        aplicação.
      </p>
    </div>
  );
}
