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
import { IntegrationIcon } from "./IntegrationIcon";
import { WebhookFlow } from "./WebhookFlow";
import "./partner-onboarding.css";

type Props = {
  applicationId: string;
  csrfToken: string;
  canManage: boolean;
  canEdit: boolean;
  onUnauthorized: () => void;
  channel?: "team" | "partner";
  onChanged?: () => void;
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
  onChanged,
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
      onChanged?.();
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
      onChanged?.();
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
      if (status === "suspended") {
        setTest(null);
        setConfigured(false);
      }
      onChanged?.();
    } catch (cause) {
      setConfirmSuspend(false);
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
      onChanged?.();
    } catch (cause) {
      setConfirmRemove(false);
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

      <WebhookFlow
        state={endpoint ? endpoint.status : "none"}
        url={endpoint?.url ?? null}
        step={step}
      />

      {!endpoint && !error && (
        <form
          className="onb card"
          noValidate
          onSubmit={(event) => void register(event)}
        >
          <span className="onb-badge" aria-hidden="true">
            <IntegrationIcon name="webhook" size={28} />
          </span>
          <h4>Conecte sua aplicação em 4 passos</h4>
          <p className="onb-lead">
            Receba um aviso assinado no seu servidor sempre que uma análise for
            concluída.
          </p>
          <ul className="onb-perks">
            <li>
              <IntegrationIcon name="shield" size={16} /> Eventos assinados
            </li>
            <li>
              <IntegrationIcon name="check" size={16} /> Teste antes de ativar
            </li>
            <li>
              <IntegrationIcon name="lock" size={16} /> Nenhuma análise ou
              cobrança no teste
            </li>
          </ul>
          <div className="form-field onb-field">
            <label
              className="form-field-label"
              htmlFor={`webhook-url-${applicationId}`}
            >
              Onde sua aplicação recebe eventos?
            </label>
            <input
              id={`webhook-url-${applicationId}`}
              className="input onb-input"
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
                "Endereço público HTTPS sob controle da sua equipe. Um destino por aplicação."}
            </span>
          </div>
          <button
            className="btn btn-primary btn-lg onb-cta"
            disabled={!canManage || !canEdit || busy || !url.trim()}
          >
            {busy ? "Preparando…" : "Começar configuração"}
          </button>
          <small className="onb-foot">
            O cadastro só prepara a chave de assinatura. Nenhuma entrega real é
            ativada ainda.
          </small>
        </form>
      )}

      {endpoint && (
        <>
          <div className="card webhook-destination">
            <div>
              <small className="rules-cell-sub">Destino completo</small>
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
