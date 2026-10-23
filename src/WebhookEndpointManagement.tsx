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
import { ConfirmDialog } from "./ConfirmDialog";
import { Checkbox } from "./controls";
import { SecretReveal } from "./SecretReveal";
import { webhookStep } from "./webhook-setup-model";
import "./partner-onboarding.css";

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

  if (!loaded)
    return (
      <div
        className="rules-skeleton"
        role="status"
        aria-label="Carregando webhook"
      >
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
    );

  const step = webhookStep({
    hasEndpoint: endpoint !== null,
    active: endpoint?.status === "active",
    configured,
    testDelivered: test?.status === "delivered",
  });
  const labels = ["Endereço", "Assinatura", "Teste", "Ativar"];
  const testResult = test && (
    <div
      className={`alert ${test.status === "delivered" ? "alert-success" : "alert-warning"}`}
      role="status"
    >
      <strong>
        {test.status === "delivered"
          ? "Teste recebido pelo destino"
          : "Teste sem confirmação de entrega"}
      </strong>
      <div>
        {test.http_status
          ? `HTTP ${test.http_status}`
          : "Sem resposta HTTP confirmada"}
        {test.duration_ms != null ? ` · ${test.duration_ms} ms` : ""}
      </div>
    </div>
  );

  return (
    <section className="cred" aria-labelledby="webhook-title">
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
              onClick={() => void sendTest()}
            >
              {busy ? "Enviando…" : "Enviar teste assinado"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => setConfirmSuspend(true)}
            >
              Suspender
            </button>
          </div>
        )}
      </header>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <ol className="stepper" aria-label="Etapas de configuração">
        {labels.map((label, index) => (
          <li key={label}>
            <span
              className="stepper-step"
              aria-current={step === index ? "step" : undefined}
              data-done={step > index}
            >
              <span aria-hidden="true">{step > index ? "✓" : index + 1}</span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {!endpoint && !error && (
        <form
          className="card cred-form"
          noValidate
          onSubmit={(event) => void register(event)}
        >
          <h4>Onde sua aplicação recebe eventos?</h4>
          <p className="form-hint">
            Informe um endereço público HTTPS sob controle da sua equipe. Um
            destino por aplicação. O cadastro prepara a chave, sem ativar
            entregas reais.
          </p>
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
              <span
                id={`webhook-url-error-${applicationId}`}
                className="form-hint onboarding-error"
                role="alert"
              >
                {urlError}
              </span>
            )}
          </div>
          <div className="appdir-actions">
            <button
              className="btn btn-primary btn-md"
              disabled={!canManage || !canEdit || busy || !url.trim()}
            >
              {busy ? "Preparando…" : "Continuar"}
            </button>
          </div>
        </form>
      )}

      {endpoint && (
        <>
          <div className="card webhook-destination">
            <div>
              <small className="rules-cell-sub">Destino</small>
              <strong className="rules-cell-main">{endpoint.url}</strong>
              <small className="rules-cell-sub">
                Evento: Análise concluída
              </small>
            </div>
            <span
              className={`badge ${endpoint.status === "active" ? "badge-success" : endpoint.status === "draft" ? "badge-neutral" : "badge-warning"}`}
            >
              {endpoint.status === "active"
                ? "Ativo"
                : endpoint.status === "draft"
                  ? "Em configuração"
                  : "Suspenso"}
            </span>
          </div>
          {endpoint.status === "active" && testResult}
          {endpoint.status !== "active" && canManage && canEdit && (
            <section className="card cred-form" aria-label="Configuração">
              {!secret && (
                <p className="form-hint">
                  A chave de assinatura não aparece de novo. Use a cópia salva
                  no seu servidor para verificar o teste.
                </p>
              )}
              <Checkbox
                id="webhook-configured"
                label="Configurei a verificação da assinatura no meu servidor."
                checked={configured}
                onChange={setConfigured}
              />
              <p className="form-hint">
                O teste usa um evento fictício assinado. Não cria análise nem
                cobrança.
              </p>
              <div className="appdir-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  disabled={busy || !configured}
                  onClick={() => void sendTest()}
                >
                  {busy ? "Enviando…" : "Enviar teste assinado"}
                </button>
                {test?.status === "delivered" && (
                  <button
                    type="button"
                    className="btn btn-primary btn-md"
                    disabled={busy}
                    onClick={() => void setStatus("active")}
                  >
                    Ativar webhook
                  </button>
                )}
              </div>
              {testResult}
              {test?.status === "delivered" && (
                <p className="form-hint">
                  O destino confirmou o teste. Ative para receber eventos reais.
                </p>
              )}
              {endpoint.status === "suspended" && !test && (
                <p className="form-hint">
                  O webhook está suspenso. Envie um novo teste antes de
                  ativá-lo.
                </p>
              )}
            </section>
          )}
          {canManage && canEdit && (
            <div>
              <button
                type="button"
                className="btn btn-ghost-danger btn-sm"
                onClick={() => setConfirmRemove(true)}
              >
                Remover destino
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmSuspend && endpoint?.status === "active"}
        title="Suspender este destino?"
        description="Eventos futuros não serão enviados até você reativar o webhook."
        details={endpoint ? [{ label: "Destino", value: endpoint.url }] : []}
        confirmLabel="Confirmar suspensão"
        busy={busy}
        onConfirm={() => void setStatus("suspended")}
        onCancel={() => setConfirmSuspend(false)}
      />
      <ConfirmDialog
        open={confirmRemove}
        tone="danger"
        title="Remover este destino?"
        description="Remover interrompe as entregas futuras. A chave atual será descartada."
        details={endpoint ? [{ label: "Destino", value: endpoint.url }] : []}
        confirmLabel="Remover destino"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmRemove(false)}
      />
      {secret && (
        <SecretReveal
          title="Chave de assinatura"
          description="Salve esta chave no servidor que recebe o webhook e verifique a assinatura HMAC de cada evento."
          secretLabel="Chave de assinatura"
          secret={secret}
          onDismiss={() => setSecret(null)}
        />
      )}
    </section>
  );
}
