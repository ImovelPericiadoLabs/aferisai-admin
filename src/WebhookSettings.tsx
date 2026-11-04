import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  activateWebhookKey,
  getApplicationWebhookEndpoint,
  listWebhookEventCatalog,
  prepareWebhookKey,
  selectWebhookEvents,
  testApplicationWebhookEndpoint,
  testWebhookKey,
  type WebhookEndpoint,
  type WebhookEventCatalogItem,
  type WebhookTestResult,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { EVENT_LABELS } from "./webhook-event-labels";
import {
  keyStage,
  selectableEvents,
  selectionChanged,
} from "./webhook-settings-model";
import { WebhookEventsSection } from "./WebhookEventsSection";
import { WebhookKeySection } from "./WebhookKeySection";
import { WebhookSimulateSection } from "./WebhookSimulateSection";
import "./webhook-settings.css";

const reasonField = {
  label: "Motivo (fica na trilha de auditoria)",
  min: 3,
  max: 500,
};

type Pending = "events" | "prepare" | "activate" | null;

export function WebhookSettings({
  applicationId,
  csrfToken,
  channel,
  endpoint,
  onEndpoint,
  onSecret,
  onUnauthorized,
  onChanged,
}: {
  applicationId: string;
  csrfToken: string;
  channel: "team" | "partner";
  endpoint: WebhookEndpoint;
  onEndpoint: (endpoint: WebhookEndpoint) => void;
  onSecret: (secret: string) => void;
  onUnauthorized: () => void;
  onChanged?: () => void;
}) {
  const [catalog, setCatalog] = useState<WebhookEventCatalogItem[] | null>(
    null,
  );
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [selected, setSelected] = useState<string[]>(
    endpoint.event_types ?? [],
  );
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keyTest, setKeyTest] = useState<WebhookTestResult | null>(null);
  const [simType, setSimType] = useState("webhook.test");
  const [simResult, setSimResult] = useState<WebhookTestResult | null>(null);

  useEffect(() => {
    let live = true;
    listWebhookEventCatalog(channel)
      .then((items) => live && setCatalog(items))
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setCatalogFailed(true);
      });
    return () => {
      live = false;
    };
  }, [channel, onUnauthorized]);

  useEffect(() => {
    setSelected(endpoint.event_types ?? []);
  }, [endpoint.event_types, endpoint.event_selection_version]);

  const events = useMemo(() => selectableEvents(catalog ?? []), [catalog]);
  const order = events.map((item) => item.type);
  const current = endpoint.event_types ?? [];
  const dirty = selectionChanged(selected, current);
  const stage = keyStage(endpoint);
  const supportsSettings = endpoint.event_selection_version !== undefined;

  function fail(cause: unknown, fallback: string) {
    if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
    else setError(cause instanceof ApiError ? cause.detail : fallback);
  }

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      onChanged?.();
    } catch (cause) {
      fail(cause, fallback);
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  const saveEvents = (reason: string) =>
    run(async () => {
      onEndpoint(
        await selectWebhookEvents(
          applicationId,
          order.filter((eventType) => selected.includes(eventType)),
          endpoint.event_selection_version ?? 1,
          csrfToken,
          channel,
          reason,
        ),
      );
    }, "Não foi possível salvar a seleção. Atualize a tela e confira a versão.");

  const prepareKey = (reason: string) =>
    run(async () => {
      const result = await prepareWebhookKey(
        applicationId,
        csrfToken,
        channel,
        reason,
      );
      setKeyTest(null);
      onEndpoint({ ...result, plain_secret: null });
      if (result.plain_secret) onSecret(result.plain_secret);
    }, "Não foi possível preparar a nova chave.");

  const activateKey = (reason: string) =>
    run(async () => {
      onEndpoint(
        await activateWebhookKey(applicationId, csrfToken, channel, reason),
      );
      setKeyTest(null);
    }, "Não foi possível ativar a nova chave.");

  async function sendKeyTest() {
    setBusy(true);
    setError("");
    try {
      setKeyTest(await testWebhookKey(applicationId, csrfToken, channel));
      onEndpoint(await getApplicationWebhookEndpoint(applicationId, channel));
      onChanged?.();
    } catch (cause) {
      fail(
        cause,
        "O resultado do teste não foi confirmado. Consulte as entregas antes de repetir.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function simulate() {
    setBusy(true);
    setError("");
    setSimResult(null);
    try {
      setSimResult(
        await testApplicationWebhookEndpoint(
          applicationId,
          csrfToken,
          channel,
          simType,
        ),
      );
      onChanged?.();
    } catch (cause) {
      fail(
        cause,
        "O resultado da simulação não foi confirmado. Consulte as entregas antes de repetir.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!supportsSettings) return null;

  return (
    <section className="card wh-settings" aria-labelledby="wh-settings-title">
      <h4 className="card-title" id="wh-settings-title">
        Eventos e chave de assinatura
      </h4>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <WebhookEventsSection
        catalog={catalog}
        catalogFailed={catalogFailed}
        events={events}
        order={order}
        selected={selected}
        busy={busy}
        dirty={dirty}
        setSelected={setSelected}
        onSave={() => setPending("events")}
      />

      <WebhookSimulateSection
        events={events}
        simType={simType}
        simResult={simResult}
        busy={busy}
        onSimType={setSimType}
        onSimulate={() => void simulate()}
      />

      <WebhookKeySection
        endpoint={endpoint}
        stage={stage}
        keyTest={keyTest}
        busy={busy}
        onPrepare={() => setPending("prepare")}
        onTest={() => void sendKeyTest()}
        onActivate={() => setPending("activate")}
      />

      <ConfirmDialog
        open={pending === "events"}
        title="Salvar eventos entregues?"
        description={
          selected.length === 0
            ? "Nenhum evento marcado: as novas entregas ficam pausadas."
            : undefined
        }
        details={[
          {
            label: "Eventos",
            value:
              selected.length === 0
                ? "Nenhum"
                : selected.map((type) => EVENT_LABELS[type] ?? type).join(", "),
          },
        ]}
        confirmLabel="Salvar seleção"
        busy={busy}
        reason={reasonField}
        onConfirm={(reason) => void saveEvents(reason)}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === "prepare"}
        title="Preparar uma nova chave?"
        description="A chave aparece uma única vez. Os eventos reais continuam assinados pela atual até a ativação. Uma chave já preparada é substituída."
        confirmLabel="Preparar nova chave"
        busy={busy}
        reason={reasonField}
        onConfirm={(reason) => void prepareKey(reason)}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === "activate"}
        title="Ativar a nova chave?"
        description="Os novos envios passam a ser assinados pela chave nova. O receptor deve aceitar a chave anterior por cinco minutos para cobrir envios em andamento."
        confirmLabel="Ativar nova chave"
        busy={busy}
        reason={reasonField}
        onConfirm={(reason) => void activateKey(reason)}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
