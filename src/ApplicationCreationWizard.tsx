import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  createAdditionalApplication,
  getApplicationRedirectUris,
  getOrganization,
  grantApplicationPermission,
  replaceApplicationRedirectUris,
} from "./api";
import {
  readAttempt,
  readDraft,
  validCallback,
  type Attempt,
  type Draft,
  type Permission,
  type Step,
} from "./application-wizard-model";
import {
  ApplicationWizardBasicsStep,
  ApplicationWizardIntegrationStep,
} from "./ApplicationWizardBasicSteps";
import {
  ApplicationWizardActions,
  ApplicationWizardProgress,
} from "./ApplicationWizardNavigation";
import {
  ApplicationWizardPermissionsStep,
  ApplicationWizardPreview,
  ApplicationWizardReviewStep,
} from "./ApplicationWizardFinalSteps";
import { uuidv7 } from "./uuidv7";
import "./application-creation-wizard.css";

export function ApplicationCreationWizard({
  organizationId,
  organizationName,
  availablePermissions,
  csrfToken,
  onCreated,
  onCancel,
  onUnauthorized,
}: {
  organizationId: string;
  organizationName: string;
  availablePermissions: Permission[];
  csrfToken: string;
  onCreated: (applicationId: string) => void;
  onCancel?: () => void;
  onUnauthorized: () => void;
}) {
  const id = useId().replaceAll(":", "");
  const storageKey = `aferis-additional-application:${organizationId}`;
  const draftStorageKey = `${storageKey}:draft`;
  const completedRef = useRef(false);
  const [initialAttempt] = useState(() => readAttempt(storageKey));
  const [initialDraft] = useState(() => readDraft(draftStorageKey));
  const [attempt, setAttempt] = useState<Attempt | null>(initialAttempt);
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState(
    () => initialAttempt?.name ?? initialDraft?.name ?? "",
  );
  const [callbackInput, setCallbackInput] = useState("");
  const [callbacks, setCallbacks] = useState<string[]>(
    () => initialDraft?.callbacks ?? [],
  );
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    () => [
      "application:read",
      ...new Set(
        (initialDraft?.permissions ?? []).filter(
          (code) =>
            code !== "application:read" &&
            availablePermissions.some((permission) => permission.code === code),
        ),
      ),
    ],
  );
  const [fieldError, setFieldError] = useState("");
  const [callbackError, setCallbackError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const permissionOptions = availablePermissions.filter(
    (permission) => permission.code !== "application:read",
  );

  useEffect(() => {
    if (completedRef.current) return;
    try {
      if (
        !name.trim() &&
        callbacks.length === 0 &&
        selectedPermissions.length === 1 &&
        !attempt
      ) {
        sessionStorage.removeItem(draftStorageKey);
        return;
      }
      const draft: Draft = {
        version: 1,
        name,
        callbacks,
        permissions: selectedPermissions,
      };
      sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // The form remains usable when browser storage is unavailable.
    }
  }, [attempt, callbacks, draftStorageKey, name, selectedPermissions]);

  function advance() {
    if (step === 0) {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 255) {
        setFieldError("Informe um nome entre 1 e 255 caracteres.");
        return;
      }
      setFieldError("");
    }
    if (step === 1 && callbackInput.trim()) {
      setCallbackError(
        "Adicione a URL digitada ou apague o campo antes de continuar.",
      );
      return;
    }
    setStep((current) => Math.min(3, current + 1) as Step);
  }

  function addCallback() {
    const next = callbackInput.trim();
    const error = validCallback(next);
    if (error) return setCallbackError(error);
    if (callbacks.includes(next))
      return setCallbackError("Esta URL já foi adicionada.");
    if (callbacks.length >= 5)
      return setCallbackError("São permitidas até cinco URLs de retorno.");
    setCallbacks((items) => [...items, next]);
    setCallbackInput("");
    setCallbackError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3 || busy) return;
    const current = attempt ?? { id: uuidv7(), name: name.trim() };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(current));
    } catch {
      // The current attempt still keeps the identifier stable until this view closes.
    }
    setAttempt(current);
    setBusy(true);
    setSaveError("");
    try {
      await createAdditionalApplication(
        organizationId,
        current.id,
        current.name,
        csrfToken,
      );
      setCreated(true);
      const detail = await getOrganization(organizationId);
      const application = detail.applications.find(
        (item) => item.id === current.id,
      );
      if (!application || application.name !== current.name) {
        throw new Error("Não foi possível conferir o cadastro da aplicação.");
      }
      for (const code of selectedPermissions) {
        if (!application.permissions.includes(code)) {
          await grantApplicationPermission(current.id, code, csrfToken);
        }
      }
      if (callbacks.length) {
        const registered = await getApplicationRedirectUris(current.id);
        if (registered.redirect_uris.join("\n") !== callbacks.join("\n")) {
          await replaceApplicationRedirectUris(
            current.id,
            callbacks,
            registered.version,
            csrfToken,
          );
        }
      }
      completedRef.current = true;
      try {
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(draftStorageKey);
      } catch {
        // Completion must not fail after the server has saved the application.
      }
      onCreated(current.id);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setSaveError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível concluir ou confirmar todas as configurações. Consulte o cadastro e tente novamente com o mesmo identificador.",
        );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-wizard" aria-labelledby={`${id}-title`}>
      <div className="app-wizard-header">
        <div>
          <p className="app-wizard-context">{organizationName} · Aplicações</p>
          <h3 id={`${id}-title`}>Nova aplicação</h3>
          <p>Cadastre o acesso e configure a integração em etapas curtas.</p>
          {(initialDraft || initialAttempt) && (
            <p className="app-wizard-resume" role="status">
              {initialAttempt
                ? "Cadastro iniciado. Confira os dados e conclua as configurações pendentes."
                : "Rascunho recuperado nesta sessão. Confira os dados antes de criar."}
            </p>
          )}
        </div>
        {onCancel && (
          <button
            type="button"
            className="app-wizard-close"
            onClick={onCancel}
            aria-label="Fechar cadastro"
          >
            ×
          </button>
        )}
      </div>
      <ApplicationWizardProgress
        step={step}
        busy={busy}
        onStep={(value) => setStep(value)}
      />
      <form onSubmit={(event) => void save(event)} noValidate>
        <div className="app-wizard-content">
          <div className="app-wizard-stage">
            {step === 0 && (
              <ApplicationWizardBasicsStep
                id={id}
                name={name}
                organizationName={organizationName}
                busy={busy}
                locked={Boolean(attempt)}
                fieldError={fieldError}
                onName={(value) => {
                  setName(value);
                  setFieldError("");
                }}
              />
            )}
            {step === 1 && (
              <ApplicationWizardIntegrationStep
                id={id}
                busy={busy}
                callbackInput={callbackInput}
                callbackError={callbackError}
                callbacks={callbacks}
                onCallbackInput={(value) => {
                  setCallbackInput(value);
                  setCallbackError("");
                }}
                onAddCallback={addCallback}
                setCallbacks={setCallbacks}
              />
            )}
            {step === 2 && (
              <ApplicationWizardPermissionsStep
                id={id}
                permissionOptions={permissionOptions}
                selectedPermissions={selectedPermissions}
                setSelectedPermissions={setSelectedPermissions}
              />
            )}
            {step === 3 && (
              <ApplicationWizardReviewStep
                name={name}
                organizationName={organizationName}
                callbacks={callbacks}
                selectedPermissions={selectedPermissions}
                attempt={Boolean(attempt)}
                created={created}
                saveError={saveError}
              />
            )}
          </div>
          <ApplicationWizardPreview
            name={name}
            organizationName={organizationName}
            callbacks={callbacks}
            selectedPermissions={selectedPermissions}
          />
        </div>
        <ApplicationWizardActions
          step={step}
          busy={busy}
          attempt={Boolean(attempt)}
          onCancel={onCancel}
          onBack={() => setStep((step - 1) as Step)}
          onNext={advance}
        />
      </form>
    </section>
  );
}
