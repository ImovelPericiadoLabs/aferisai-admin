import type { FormEvent } from "react";

export function WebhookSetupPanel({
  applicationId,
  url,
  urlError,
  error,
  busy,
  canManage,
  canEdit,
  onUrlChange,
  onSubmit,
  onClose,
}: {
  applicationId: string;
  url: string;
  urlError: string;
  error: string;
  busy: boolean;
  canManage: boolean;
  canEdit: boolean;
  onUrlChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="webhook-drawer-title">
            Passo 1 · Endereço
          </h2>
          <p className="rules-panel-sub">
            Onde sua aplicação recebe os eventos.
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-label="Fechar"
          disabled={busy}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <form
        id="webhook-register-form"
        className="detail-panel-body"
        noValidate
        onSubmit={onSubmit}
      >
        {error && (
          <div className="alert alert-danger form-alert" role="alert">
            {error}
          </div>
        )}
        <div className="form-field">
          <label
            className="form-field-label"
            htmlFor={`webhook-url-${applicationId}`}
          >
            URL do webhook
          </label>
          <input
            id={`webhook-url-${applicationId}`}
            className="input"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://api.suaempresa.com/webhooks/aferis"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            aria-invalid={Boolean(urlError)}
            aria-describedby={`webhook-url-hint-${applicationId}`}
            disabled={busy || !canEdit}
            required
          />
          <span
            id={`webhook-url-hint-${applicationId}`}
            className={`form-hint${urlError ? " onboarding-error" : ""}`}
            role={urlError ? "alert" : undefined}
          >
            {urlError ||
              "Endereço público HTTPS sob controle da sua equipe. Um destino por aplicação. Porta padrão ou 8443."}
          </span>
        </div>
      </form>
      <div className="detail-panel-footer">
        <button
          className="btn btn-primary btn-md"
          type="submit"
          form="webhook-register-form"
          disabled={!canManage || !canEdit || busy || !url.trim()}
        >
          {busy ? "Preparando…" : "Registrar e continuar"}
        </button>
        <button
          className="btn btn-ghost btn-md"
          type="button"
          disabled={busy}
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </>
  );
}
