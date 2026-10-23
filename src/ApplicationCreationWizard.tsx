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
  applicationPermissionDescription,
  applicationPermissionGlyph,
  applicationPermissionLabel,
} from "./display-labels";
import { uuidv7 } from "./uuidv7";
import "./application-creation-wizard.css";

type Permission = { code: string; description: string };
type Attempt = { id: string; name: string };
type Draft = {
  version: 1;
  name: string;
  callbacks: string[];
  permissions: string[];
};
type Step = 0 | 1 | 2 | 3;
const stepNames = [
  "Dados básicos",
  "Integração",
  "Permissões",
  "Revisão",
] as const;

function readAttempt(key: string): Attempt | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    return typeof record.id === "string" && typeof record.name === "string"
      ? { id: record.id, name: record.name }
      : null;
  } catch {
    return null;
  }
}

function readDraft(key: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (
      record.version !== 1 ||
      typeof record.name !== "string" ||
      !Array.isArray(record.callbacks) ||
      !Array.isArray(record.permissions)
    )
      return null;
    return {
      version: 1,
      name: record.name.slice(0, 255),
      callbacks: Array.from(
        new Set(
          record.callbacks.filter(
            (value): value is string =>
              typeof value === "string" && validCallback(value) === null,
          ),
        ),
      ).slice(0, 5),
      permissions: record.permissions.filter(
        (value): value is string => typeof value === "string",
      ),
    };
  } catch {
    return null;
  }
}

function validCallback(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    )
      return "Use uma URL HTTPS pública, sem parâmetros, fragmento ou credenciais.";
    return null;
  } catch {
    return "Informe uma URL HTTPS válida.";
  }
}

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
      <nav className="app-wizard-progress" aria-label="Etapas do cadastro">
        {stepNames.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-current={step === index ? "step" : undefined}
            data-completed={index < step ? "true" : undefined}
            disabled={busy || index > step}
            onClick={() => setStep(index as Step)}
          >
            <span className="app-wizard-step-number" aria-hidden="true">
              {index + 1}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <form onSubmit={(event) => void save(event)} noValidate>
        <div className="app-wizard-content">
          <div className="app-wizard-stage">
            {step === 0 && (
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
                      disabled={busy || Boolean(attempt)}
                      autoComplete="off"
                      placeholder="Ex.: Portal de documentos"
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={
                        fieldError ? `${id}-name-error` : undefined
                      }
                      onChange={(event) => {
                        setName(event.target.value);
                        setFieldError("");
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
                    <small>
                      Use um nome que sua equipe reconheça facilmente.
                    </small>
                  </div>
                  <div className="app-wizard-fact">
                    <span>Empresa responsável</span>
                    <strong>{organizationName}</strong>
                    <small>A aplicação ficará vinculada a esta empresa.</small>
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="app-wizard-section">
                <div className="app-wizard-section-heading">
                  <h4>Integração</h4>
                  <p>
                    Adicione os retornos OAuth necessários. O webhook é
                    configurado após criar a aplicação, com chave e teste
                    assinado.
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
                        callbackError
                          ? `${id}-callback-error`
                          : `${id}-callback-help`
                      }
                      onChange={(event) => {
                        setCallbackInput(event.target.value);
                        setCallbackError("");
                      }}
                    />
                    <button
                      type="button"
                      className="button secondary"
                      disabled={!callbackInput.trim() || busy}
                      onClick={addCallback}
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
                  Webhook: endereço, assinatura e evento de teste serão
                  configurados na aplicação.
                </p>
              </div>
            )}
            {step === 2 && (
              <div className="app-wizard-section">
                <div className="app-wizard-section-heading">
                  <h4>Permissões</h4>
                  <p>
                    Escolha os acessos desta aplicação. O usuário parceiro só
                    verá as integrações da própria empresa.
                  </p>
                </div>
                <ul className="app-wizard-permissions">
                  <li className="app-wizard-permission-required">
                    <span
                      className="app-wizard-permission-icon"
                      aria-hidden="true"
                    >
                      {applicationPermissionGlyph("application:read")}
                    </span>
                    <span>
                      <strong>
                        {applicationPermissionLabel("application:read")}
                      </strong>
                      <small>
                        {applicationPermissionDescription("application:read")}
                      </small>
                    </span>
                    <span className="app-wizard-required">Obrigatória</span>
                  </li>
                  {permissionOptions.map((permission, index) => (
                    <li
                      key={permission.code}
                      className={
                        selectedPermissions.includes(permission.code)
                          ? "is-selected"
                          : ""
                      }
                    >
                      <label
                        htmlFor={`${id}-permission-${index}`}
                        className="app-wizard-permission-option"
                      >
                        <span
                          className="app-wizard-permission-icon"
                          aria-hidden="true"
                        >
                          {applicationPermissionGlyph(
                            permission.code,
                            index + 1,
                          )}
                        </span>
                        <span>
                          <strong>
                            {applicationPermissionLabel(permission.code)}
                          </strong>
                          <small>
                            {applicationPermissionDescription(
                              permission.code,
                              permission.description,
                            )}
                          </small>
                        </span>
                        <input
                          id={`${id}-permission-${index}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(
                            permission.code,
                          )}
                          onChange={(event) =>
                            setSelectedPermissions((items) =>
                              event.target.checked
                                ? [...items, permission.code]
                                : items.filter(
                                    (code) => code !== permission.code,
                                  ),
                            )
                          }
                        />
                      </label>
                    </li>
                  ))}
                </ul>
                {permissionOptions.length === 0 && (
                  <p className="app-wizard-inline-note">
                    Nenhuma permissão adicional está disponível no catálogo
                    desta empresa.
                  </p>
                )}
              </div>
            )}
            {step === 3 && (
              <div className="app-wizard-section">
                <div className="app-wizard-section-heading">
                  <h4>Revisão</h4>
                  <p>Confira os dados antes de criar a aplicação.</p>
                </div>
                <dl className="app-wizard-review">
                  <div>
                    <dt>Aplicação</dt>
                    <dd>{name.trim()}</dd>
                  </div>
                  <div>
                    <dt>Empresa</dt>
                    <dd>{organizationName}</dd>
                  </div>
                  <div>
                    <dt>URLs de retorno</dt>
                    <dd>
                      {callbacks.length
                        ? callbacks.join(" · ")
                        : "Nenhuma por enquanto"}
                    </dd>
                  </div>
                  <div>
                    <dt>Permissões</dt>
                    <dd>
                      {selectedPermissions
                        .map((code) => applicationPermissionLabel(code))
                        .join(" · ")}
                    </dd>
                  </div>
                </dl>
                <p className="app-wizard-inline-note">
                  Após salvar, configure o webhook e emita uma credencial no
                  detalhe da aplicação. Essas etapas não ativam eventos
                  automaticamente.
                </p>
                {attempt && (
                  <p className="app-wizard-retry">
                    {created
                      ? "Aplicação criada; concluindo configurações pendentes."
                      : "Tentativa em andamento."}{" "}
                    O mesmo identificador será usado ao tentar novamente.
                  </p>
                )}
                {saveError && (
                  <p className="app-wizard-save-error" role="alert">
                    {saveError}
                  </p>
                )}
              </div>
            )}
          </div>
          <aside
            className="app-wizard-preview"
            aria-label="Prévia da aplicação"
          >
            <p className="app-wizard-preview-kicker">Prévia da aplicação</p>
            <h4>{name.trim() || "Nome da aplicação"}</h4>
            <p className="app-wizard-preview-org">{organizationName}</p>
            <dl>
              <div>
                <dt>Retornos OAuth</dt>
                <dd>{callbacks.length}</dd>
              </div>
              <div>
                <dt>Permissões</dt>
                <dd>{selectedPermissions.length}</dd>
              </div>
              <div>
                <dt>Webhook</dt>
                <dd>Configurar após criar</dd>
              </div>
            </dl>
            <p className="app-wizard-preview-note">
              O acesso da aplicação permanece limitado às permissões
              selecionadas.
            </p>
          </aside>
        </div>
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
                onClick={() => setStep((step - 1) as Step)}
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
                  advance();
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
      </form>
    </section>
  );
}
