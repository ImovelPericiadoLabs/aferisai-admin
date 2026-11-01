import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDialogFocus } from "./useDialogFocus";
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
import { SecretReveal } from "./SecretReveal";
import { webhookStep } from "./webhook-setup-model";
import {
  validUrl,
  type WebhookEndpointManagementProps as Props,
} from "./webhook-endpoint-model";
import { WebhookConfirmDialogs } from "./WebhookConfirmDialogs";
import { WebhookConfigPanel } from "./WebhookConfigPanel";
import { WebhookDestination } from "./WebhookDestination";
import { WebhookDrawer } from "./WebhookDrawer";
import { WebhookFlow } from "./WebhookFlow";
import { WebhookHeader } from "./WebhookHeader";
import { WebhookOnboardingCard } from "./WebhookOnboardingCard";
import { WebhookPayloads } from "./WebhookPayloads";
import { WebhookSettings } from "./WebhookSettings";
import { WebhookSetupPanel } from "./WebhookSetupPanel";
import { WebhookTestResultAlert } from "./WebhookTestResultAlert";
import "./partner-onboarding.css";

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
  const [drawer, setDrawer] = useState<null | "setup" | "config">(null);
  const panelRef = useRef<HTMLElement>(null);
  useDialogFocus(drawer !== null, panelRef, () => {
    if (!busy) setDrawer(null);
  });

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
      setDrawer(null);
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

  async function setStatus(status: "active" | "suspended", reason?: string) {
    setBusy(true);
    setError("");
    try {
      setEndpoint(
        await updateApplicationWebhookEndpointStatus(
          applicationId,
          status,
          csrfToken,
          channel,
          reason,
        ),
      );
      setSecret(null);
      setConfirmSuspend(false);
      setDrawer(null);
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

  async function remove(reason: string) {
    setBusy(true);
    setError("");
    try {
      await deleteApplicationWebhookEndpoint(
        applicationId,
        csrfToken,
        channel,
        reason,
      );
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
  const testResult = test && <WebhookTestResultAlert test={test} />;

  return (
    <section className="cred" aria-labelledby="webhook-title">
      <WebhookHeader
        endpoint={endpoint}
        canManage={canManage}
        canEdit={canEdit}
        busy={busy}
        onSendTest={() => void sendTest()}
        onSuspend={() => setConfirmSuspend(true)}
      />
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
        <WebhookOnboardingCard
          disabled={!canManage || !canEdit || busy}
          onStart={() => setDrawer("setup")}
        />
      )}

      {endpoint && (
        <WebhookDestination
          endpoint={endpoint}
          step={step}
          test={test}
          testResult={testResult}
          canManage={canManage}
          canEdit={canEdit}
          busy={busy}
          onContinue={() => setDrawer("config")}
          onRemove={() => setConfirmRemove(true)}
        />
      )}

      {endpoint && endpoint.status !== "draft" && canManage && canEdit && (
        <WebhookSettings
          applicationId={applicationId}
          csrfToken={csrfToken}
          channel={channel}
          endpoint={endpoint}
          onEndpoint={setEndpoint}
          onSecret={setSecret}
          onUnauthorized={onUnauthorized}
          onChanged={onChanged}
        />
      )}

      <WebhookPayloads endpointUrl={endpoint?.url ?? null} />

      <WebhookDrawer
        open={drawer !== null}
        panelRef={panelRef}
        busy={busy}
        onClose={() => setDrawer(null)}
      >
        {drawer === "setup" && (
          <WebhookSetupPanel
            applicationId={applicationId}
            url={url}
            urlError={urlError}
            error={error}
            busy={busy}
            canManage={canManage}
            canEdit={canEdit}
            onUrlChange={(value) => {
              setUrl(value);
              setUrlError("");
            }}
            onSubmit={(event) => void register(event)}
            onClose={() => setDrawer(null)}
          />
        )}
        {drawer === "config" && endpoint && (
          <WebhookConfigPanel
            endpoint={endpoint}
            error={error}
            busy={busy}
            hasSecret={Boolean(secret)}
            configured={configured}
            test={test}
            testResult={testResult}
            onConfiguredChange={setConfigured}
            onSendTest={() => void sendTest()}
            onActivate={() => void setStatus("active")}
            onClose={() => setDrawer(null)}
          />
        )}
      </WebhookDrawer>

      <WebhookConfirmDialogs
        endpoint={endpoint}
        confirmSuspend={confirmSuspend}
        confirmRemove={confirmRemove}
        busy={busy}
        onSuspend={(reason) => void setStatus("suspended", reason)}
        onRemove={(reason) => void remove(reason)}
        onCancelSuspend={() => setConfirmSuspend(false)}
        onCancelRemove={() => setConfirmRemove(false)}
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
