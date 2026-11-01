import type { WebhookEndpoint } from "./api";

export function WebhookHeader({
  endpoint,
  canManage,
  canEdit,
  busy,
  onSendTest,
  onSuspend,
}: {
  endpoint: WebhookEndpoint | null;
  canManage: boolean;
  canEdit: boolean;
  busy: boolean;
  onSendTest: () => void;
  onSuspend: () => void;
}) {
  return (
    <header className="cred-head">
      <div>
        <h3 className="appws-section-title" id="webhook-title">
          Webhook
        </h3>
        <p className="form-hint">
          Receba um aviso assinado quando a análise for concluída.
        </p>
      </div>
      {endpoint?.status === "active" && canManage && canEdit && (
        <div className="appdir-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={onSendTest}
          >
            {busy ? "Enviando…" : "Enviar teste assinado"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={onSuspend}
          >
            Suspender
          </button>
        </div>
      )}
    </header>
  );
}
