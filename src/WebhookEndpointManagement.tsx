import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  deleteApplicationWebhookEndpoint,
  getApplicationWebhookEndpoint,
  registerApplicationWebhookEndpoint,
  testApplicationWebhookEndpoint,
  updateApplicationWebhookEndpointStatus,
  type WebhookEndpoint,
  type WebhookTestResult,
} from "./api";

type Props = {
  applicationId: string;
  csrfToken: string;
  canManage: boolean;
  canEdit: boolean;
  onUnauthorized: () => void;
  channel?: "team" | "partner";
};

function validUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      Boolean(parsed.hostname) &&
      (!parsed.port || ["443", "8443"].includes(parsed.port)) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export function WebhookEndpointManagement({
  applicationId,
  csrfToken,
  canManage,
  canEdit,
  onUnauthorized,
  channel = "team",
}: Props) {
  const [endpoint, setEndpoint] = useState<WebhookEndpoint | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [test, setTest] = useState<WebhookTestResult | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    getApplicationWebhookEndpoint(applicationId, channel)
      .then((result) => {
        if (live) setEndpoint(result);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 404) return;
        if (cause instanceof ApiError && cause.status === 401) {
          onUnauthorized();
          return;
        }
        setError(
          "Não foi possível consultar o webhook. Atualize a página para tentar novamente.",
        );
      })
      .finally(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [applicationId, onUnauthorized, channel]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validUrl(url.trim())) {
      setUrlError("Informe uma URL HTTPS pública. Use a porta padrão ou 8443.");
      return;
    }
    setBusy(true);
    setError("");
    setUrlError("");
    try {
      const result = await registerApplicationWebhookEndpoint(
        applicationId,
        url.trim(),
        csrfToken,
        channel,
      );
      setEndpoint(result);
      setSecret(result.plain_secret);
      setUrl("");
      setConfigured(false);
      setTest(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (cause instanceof ApiError && cause.status === 409)
        setError(
          "Esta aplicação já tem um webhook. Atualize a tela antes de registrar outro.",
        );
      else if (cause instanceof ApiError && cause.status === 422)
        setUrlError(cause.detail);
      else
        setError(
          "Não foi possível confirmar o cadastro. Atualize a tela antes de tentar novamente.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setError("");
    setTest(null);
    try {
      setTest(
        await testApplicationWebhookEndpoint(applicationId, csrfToken, channel),
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "O resultado do teste não foi confirmado. Consulte as entregas antes de testar novamente.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "active" | "suspended") {
    setBusy(true);
    setError("");
    try {
      setEndpoint(
        await updateApplicationWebhookEndpointStatus(
          applicationId,
          status,
          csrfToken,
          channel,
        ),
      );
      setSecret(null);
      setConfirmSuspend(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível alterar o estado do webhook.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await deleteApplicationWebhookEndpoint(applicationId, csrfToken, channel);
      setEndpoint(null);
      setSecret(null);
      setTest(null);
      setConfirmRemove(false);
      setConfigured(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          "Não foi possível confirmar a remoção. Atualize antes de repetir.",
        );
    } finally {
      setBusy(false);
    }
  }

  function copySecret() {
    if (!secret) return;
    void navigator.clipboard
      .writeText(secret)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() =>
        setError(
          "Não foi possível copiar. Selecione a chave e copie manualmente.",
        ),
      );
  }

  if (!loaded)
    return (
      <div
        className="integration-skeleton"
        role="status"
        aria-label="Carregando webhook"
      >
        <i />
        <i />
      </div>
    );

  return (
    <section className="webhook-page" aria-labelledby="webhook-title">
      <div className="integration-toolbar">
        <div>
          <h4 id="webhook-title">Webhook</h4>
          <p>Receba um aviso assinado quando a análise for concluída.</p>
        </div>
        {endpoint?.status === "active" && canManage && canEdit && (
          <div className="webhook-toolbar-actions">
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void sendTest()}
            >
              {busy ? "Enviando…" : "Enviar teste assinado"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmSuspend(true)}
            >
              Suspender
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {confirmSuspend && endpoint?.status === "active" && (
        <div
          className="webhook-suspend-review"
          role="group"
          aria-label="Revisar suspensão do webhook"
        >
          <div>
            <strong>Suspender este destino?</strong>
            <p>
              Eventos futuros não serão enviados até você reativar o webhook.
            </p>
          </div>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => setConfirmSuspend(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={() => void setStatus("suspended")}
          >
            Confirmar suspensão
          </button>
        </div>
      )}
      {!endpoint && !error && (
        <form
          className="webhook-setup"
          noValidate
          onSubmit={(event) => void register(event)}
        >
          <div className="webhook-steps" aria-label="Etapas de configuração">
            <span className="current">1 · Endereço</span>
            <span>2 · Assinatura</span>
            <span>3 · Teste</span>
            <span>4 · Ativar</span>
          </div>
          <h5>Onde sua aplicação recebe eventos?</h5>
          <p>
            Informe um endereço público HTTPS sob controle da sua equipe. Um
            destino por aplicação.
          </p>
          <div className="field">
            <label htmlFor={`webhook-url-${applicationId}`}>
              URL do webhook
            </label>
            <input
              id={`webhook-url-${applicationId}`}
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://api.suaempresa.com/webhooks/aferis"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setUrlError("");
              }}
              aria-invalid={Boolean(urlError)}
              aria-describedby={
                urlError ? `webhook-url-error-${applicationId}` : undefined
              }
              disabled={busy || !canEdit}
              required
            />
            {urlError && (
              <small
                id={`webhook-url-error-${applicationId}`}
                className="webhook-field-error"
                role="alert"
              >
                {urlError}
              </small>
            )}
          </div>
          <div className="webhook-actions">
            <span>O cadastro prepara a chave, sem ativar entregas reais.</span>
            <button
              className="button primary"
              disabled={!canManage || !canEdit || busy || !url.trim()}
            >
              {busy ? "Preparando…" : "Continuar"}
            </button>
          </div>
        </form>
      )}
      {endpoint && (
        <>
          <div className="webhook-destination">
            <div>
              <small>DESTINO</small>
              <strong>{endpoint.url}</strong>
              <span>Evento: Análise concluída</span>
            </div>
            <span
              className={`integration-status ${endpoint.status === "active" ? "is-active" : "is-paused"}`}
            >
              <span aria-hidden="true">
                {endpoint.status === "active" ? "✓" : "Ⅱ"}
              </span>
              {endpoint.status === "active"
                ? "Ativo"
                : endpoint.status === "draft"
                  ? "Em configuração"
                  : "Suspenso"}
            </span>
          </div>
          {endpoint.status === "active" && test && (
            <div
              className={`webhook-test-result ${test.status === "delivered" ? "is-success" : ""}`}
              role="status"
            >
              <strong>
                {test.status === "delivered"
                  ? "Teste recebido pelo destino"
                  : "Teste sem confirmação de entrega"}
              </strong>
              <span>
                {test.http_status
                  ? `HTTP ${test.http_status}`
                  : "Sem resposta HTTP confirmada"}
                {test.duration_ms != null ? ` · ${test.duration_ms} ms` : ""}
              </span>
            </div>
          )}
          {endpoint.status !== "active" && canManage && canEdit && (
            <div className="webhook-setup">
              <div
                className="webhook-steps"
                aria-label="Etapas de configuração"
              >
                <span className="done">✓ Endereço</span>
                <span className={secret ? "current" : undefined}>
                  2 · Assinatura
                </span>
                <span>3 · Teste</span>
                <span>4 · Ativar</span>
              </div>
              {secret && (
                <div className="webhook-secret" role="status">
                  <h5>Chave de assinatura · exibição única</h5>
                  <p>
                    Salve esta chave no servidor que recebe o webhook. Verifique
                    a assinatura HMAC de cada evento.
                  </p>
                  <code>{secret}</code>
                  <div className="webhook-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={copySecret}
                    >
                      {copied ? "Copiada" : "Copiar chave"}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setSecret(null)}
                    >
                      Já salvei, ocultar
                    </button>
                  </div>
                </div>
              )}
              {!secret && (
                <p className="webhook-note">
                  A chave não aparece novamente. Use a cópia salva no seu
                  servidor para verificar o teste.
                </p>
              )}
              <label className="webhook-check">
                <input
                  type="checkbox"
                  checked={configured}
                  onChange={(event) => setConfigured(event.target.checked)}
                />{" "}
                Configurei a verificação da assinatura no meu servidor.
              </label>
              <div className="webhook-actions">
                <span>
                  O teste usa um evento fictício assinado. Não cria análise nem
                  cobrança.
                </span>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || !configured}
                  onClick={() => void sendTest()}
                >
                  {busy ? "Enviando…" : "Enviar teste assinado"}
                </button>
              </div>
              {test && (
                <div
                  className={`webhook-test-result ${test.status === "delivered" ? "is-success" : ""}`}
                  role="status"
                >
                  <strong>
                    {test.status === "delivered"
                      ? "Teste recebido pelo destino"
                      : "Teste sem confirmação de entrega"}
                  </strong>
                  <span>
                    {test.http_status
                      ? `HTTP ${test.http_status}`
                      : "Sem resposta HTTP confirmada"}
                    {test.duration_ms != null
                      ? ` · ${test.duration_ms} ms`
                      : ""}
                  </span>
                </div>
              )}
              {test?.status === "delivered" && (
                <div className="webhook-actions">
                  <span>
                    O destino confirmou o teste. Ative para receber eventos
                    reais.
                  </span>
                  <button
                    type="button"
                    className="button primary"
                    disabled={busy}
                    onClick={() => void setStatus("active")}
                  >
                    Ativar webhook
                  </button>
                </div>
              )}
              {endpoint.status === "suspended" && !test && (
                <p className="webhook-note">
                  O webhook está suspenso. Envie um novo teste antes de
                  ativá-lo.
                </p>
              )}
            </div>
          )}
          {canManage && canEdit && (
            <div className="webhook-danger">
              {!confirmRemove ? (
                <button
                  type="button"
                  className="back-link"
                  onClick={() => setConfirmRemove(true)}
                >
                  Remover destino
                </button>
              ) : (
                <div>
                  <p>
                    Remover o destino interrompe entregas futuras. A chave atual
                    será descartada.
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    Confirmar remoção
                  </button>
                  <button
                    type="button"
                    className="back-link"
                    onClick={() => setConfirmRemove(false)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
