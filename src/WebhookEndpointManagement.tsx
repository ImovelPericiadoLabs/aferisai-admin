import { useEffect, useState } from "react";
import {
  ApiError,
  deleteApplicationWebhookEndpoint,
  getApplicationWebhookEndpoint,
  registerApplicationWebhookEndpoint,
  updateApplicationWebhookEndpointStatus,
  type WebhookEndpoint,
} from "./api";

type Props = {
  applicationId: string;
  csrfToken: string;
  canManage: boolean;
  canEdit: boolean;
  onUnauthorized: () => void;
};

function dateLabel(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(d);
}

export function WebhookEndpointManagement({
  applicationId,
  csrfToken,
  canManage,
  canEdit,
  onUnauthorized,
}: Props) {
  const [endpoint, setEndpoint] = useState<WebhookEndpoint | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [plainSecret, setPlainSecret] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    getApplicationWebhookEndpoint(applicationId)
      .then((ep) => {
        if (!live) return;
        setEndpoint(ep);
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 404) {
          setEndpoint(null);
        } else if (cause instanceof ApiError && cause.status === 401) {
          onUnauthorized();
          return;
        } else {
          setError("Não foi possível consultar o endpoint de webhook.");
        }
        setLoaded(true);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ep = await registerApplicationWebhookEndpoint(
        applicationId,
        urlInput,
        csrfToken,
      );
      setEndpoint(ep);
      setPlainSecret(ep.plain_secret);
      setUrlInput("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (cause instanceof ApiError && cause.status === 409)
        setError(
          "Já existe um endpoint registrado. Remova o atual antes de registrar outro.",
        );
      else if (cause instanceof ApiError && cause.status === 422)
        setError(
          "URL inválida. Use HTTPS com nome DNS válido e porta 443 ou 8443.",
        );
      else setError("Não foi possível registrar o endpoint.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(status: "active" | "suspended") {
    setBusy(true);
    setError("");
    try {
      const ep = await updateApplicationWebhookEndpointStatus(
        applicationId,
        status,
        csrfToken,
      );
      setEndpoint(ep);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError("Não foi possível atualizar o estado do endpoint.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      await deleteApplicationWebhookEndpoint(applicationId, csrfToken);
      setEndpoint(null);
      setConfirmDelete(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError("Não foi possível remover o endpoint.");
    } finally {
      setBusy(false);
    }
  }

  function handleCopySecret() {
    if (!plainSecret) return;
    void navigator.clipboard.writeText(plainSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!loaded) return <p role="status">Carregando webhook…</p>;

  return (
    <section className="credential-panel" aria-label="Webhook da aplicação">
      <div className="detail-card-head">
        <h5>Webhook</h5>
      </div>
      <p>
        Receba notificações de eventos <code>analysis.completed</code> no
        endpoint registrado.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {plainSecret && (
        <div className="credential-issued" role="status">
          <strong>Segredo do webhook: exibição única</strong>
          <p>Guarde este segredo agora. Ele não será exibido novamente.</p>
          <p className="muted">
            Use como chave HMAC-SHA256 para verificar{" "}
            <code>X-Aferis-Signature</code> nas entregas.
          </p>
          <dl>
            <div>
              <dt>Segredo</dt>
              <dd className="secret">{plainSecret}</dd>
            </div>
          </dl>
          <div className="button-row">
            <button
              className="button secondary"
              type="button"
              onClick={handleCopySecret}
            >
              {copied ? "Copiado!" : "Copiar segredo"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => setPlainSecret(null)}
            >
              Entendi, ocultar segredo
            </button>
          </div>
        </div>
      )}

      {!endpoint ? (
        <>
          <p className="detail-empty">Nenhum endpoint de webhook registrado.</p>
          {canManage && canEdit && (
            <form
              onSubmit={(e) => void handleRegister(e)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div className="field">
                <label htmlFor="webhook-url">URL do endpoint</label>
                <input
                  id="webhook-url"
                  className="input"
                  type="url"
                  placeholder="https://partner.example.com/webhooks"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  required
                  disabled={busy}
                />
              </div>
              <button
                className="button primary"
                type="submit"
                disabled={busy || !urlInput}
              >
                {busy ? "Registrando…" : "Registrar endpoint"}
              </button>
            </form>
          )}
          {(!canManage || !canEdit) && (
            <p>
              A organização e a aplicação precisam estar ativas para registrar
              um endpoint.
            </p>
          )}
        </>
      ) : (
        <>
          <dl>
            <div>
              <dt>URL</dt>
              <dd>
                <code>{endpoint.url}</code>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={`badge ${endpoint.status === "active" ? "badge-green" : "badge-yellow"}`}
                >
                  {endpoint.status === "active" ? "Ativo" : "Suspenso"}
                </span>
              </dd>
            </div>
            <div>
              <dt>Registrado em</dt>
              <dd>{dateLabel(endpoint.created_at)}</dd>
            </div>
          </dl>
          {canManage && canEdit && (
            <div className="button-row" style={{ marginTop: "0.75rem" }}>
              {endpoint.status === "active" ? (
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void handleStatus("suspended")}
                >
                  {busy ? "Aguarde…" : "Suspender"}
                </button>
              ) : (
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void handleStatus("active")}
                >
                  {busy ? "Aguarde…" : "Ativar"}
                </button>
              )}
              {!confirmDelete ? (
                <button
                  className="back-link"
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                  style={{ color: "var(--danger, #dc2626)" }}
                >
                  Remover endpoint
                </button>
              ) : (
                <div className="credential-confirm">
                  <p>
                    Remover o endpoint é permanente. Nenhum evento será entregue
                    após a remoção.
                  </p>
                  <div className="button-row">
                    <button
                      className="button secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete()}
                    >
                      {busy ? "Removendo…" : "Confirmar remoção"}
                    </button>
                    <button
                      className="back-link"
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
