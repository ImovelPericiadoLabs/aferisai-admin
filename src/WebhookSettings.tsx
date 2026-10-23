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
import { Checkbox } from "./controls";
import { relativeTime } from "./integration-insights-model";
import {
  keyStage,
  selectableEvents,
  selectionChanged,
  toggleEvent,
} from "./webhook-settings-model";
import "./webhook-settings.css";

const EVENT_LABELS: Record<string, string> = {
  "analysis.created": "Análise criada",
  "analysis.completed": "Análise concluída",
};

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
          selected,
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

      <div className="wh-block">
        <h5>Eventos entregues</h5>
        <p className="form-hint">
          Sem nenhum evento marcado, as novas entregas ficam pausadas. Mudar a
          seleção não recria eventos antigos.
        </p>
        {catalog === null && !catalogFailed ? (
          <div
            className="rules-skeleton"
            role="status"
            aria-label="Carregando eventos"
          >
            <span className="skeleton" />
          </div>
        ) : catalogFailed ? (
          <div className="alert alert-warning" role="alert">
            Não foi possível carregar o catálogo de eventos.
          </div>
        ) : (
          <>
            <div className="wh-events">
              {events.map((item) => (
                <Checkbox
                  key={item.type}
                  id={`wh-event-${item.type}`}
                  label={EVENT_LABELS[item.type] ?? item.type}
                  description={`${item.type} · versão ${item.version}`}
                  checked={selected.includes(item.type)}
                  disabled={busy}
                  onChange={() =>
                    setSelected((now) => toggleEvent(now, item.type, order))
                  }
                />
              ))}
            </div>
            <div>
              <button
                type="button"
                className="btn btn-primary btn-md"
                disabled={busy || !dirty}
                onClick={() => setPending("events")}
              >
                Salvar seleção
              </button>
            </div>
          </>
        )}
      </div>

      <div className="wh-block">
        <h5>Simular evento</h5>
        <p className="form-hint">
          Envia dados fictícios (marcados como sintéticos) ao destino. Não cria
          análise nem cobrança; limite de dez por hora.
        </p>
        <div className="wh-actions">
          <select
            className="input"
            aria-label="Evento a simular"
            value={simType}
            disabled={busy}
            onChange={(event) => setSimType(event.target.value)}
          >
            <option value="webhook.test">Evento de teste</option>
            {events.map((item) => (
              <option key={item.type} value={item.type}>
                {EVENT_LABELS[item.type] ?? item.type}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={busy}
            onClick={() => void simulate()}
          >
            Enviar simulação
          </button>
        </div>
        {simResult && (
          <div
            className={`alert ${simResult.status === "delivered" ? "alert-success" : "alert-warning"}`}
            role="status"
          >
            {simResult.status === "delivered"
              ? `O destino respondeu HTTP ${simResult.http_status}.`
              : "Sem confirmação de entrega. Veja a aba Entregas."}
          </div>
        )}
      </div>

      <div className="wh-block">
        <h5>
          Chave de assinatura{" "}
          <span className="badge badge-neutral">
            versão {endpoint.key_version ?? 1}
          </span>
        </h5>
        {stage === "none" && (
          <>
            <p className="form-hint">
              Gire a chave sem derrubar o receptor: prepare a nova, cadastre-a
              no servidor, teste e só então ative. Os eventos reais continuam
              assinados pela chave atual até a ativação.
            </p>
            <div>
              <button
                type="button"
                className="btn btn-secondary btn-md"
                disabled={busy}
                onClick={() => setPending("prepare")}
              >
                Preparar nova chave
              </button>
            </div>
          </>
        )}
        {stage !== "none" && (
          <>
            <p className="form-hint">
              Nova chave (versão {endpoint.pending_key_version}) preparada
              {endpoint.pending_key_prepared_at
                ? ` ${relativeTime(endpoint.pending_key_prepared_at)}`
                : ""}
              . O teste usa só a chave nova e envia o cabeçalho
              X-Aferis-Key-Version.
            </p>
            {keyTest && (
              <div
                className={`alert ${keyTest.status === "delivered" ? "alert-success" : "alert-warning"}`}
                role="status"
              >
                {keyTest.status === "delivered"
                  ? "O destino aceitou o teste com a chave nova."
                  : "O teste não foi confirmado. Confira o receptor e tente de novo."}
              </div>
            )}
            <div className="wh-actions">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                disabled={busy}
                onClick={() => void sendKeyTest()}
              >
                {busy ? "Enviando…" : "Testar nova chave"}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                disabled={busy || stage !== "tested"}
                onClick={() => setPending("activate")}
              >
                Ativar nova chave
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-md"
                disabled={busy}
                onClick={() => setPending("prepare")}
              >
                Gerar outra
              </button>
            </div>
            {stage === "prepared" && (
              <small className="form-hint">
                A ativação libera depois de um teste confirmado.
              </small>
            )}
          </>
        )}
      </div>

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
