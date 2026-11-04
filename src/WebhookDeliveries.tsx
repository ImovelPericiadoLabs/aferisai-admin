import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import "./webhook-settings.css";
import { summarizeDeliveries } from "./application-overview-model";
import { useDialogFocus } from "./useDialogFocus";
import { DeliveryCharts } from "./DeliveryCharts";
import { eventLabel } from "./delivery-labels";
import { filters, type Filter } from "./webhook-deliveries-model";
import { WebhookDeliveryDetailPanel } from "./WebhookDeliveryDetailPanel";
import {
  WebhookDeliveryFilters,
  type DeliveryKind,
} from "./WebhookDeliveryFilters";
import { WebhookDeliveryFeed } from "./WebhookDeliveryFeed";
import {
  ApiError,
  getApplicationWebhookDelivery,
  listApplicationWebhookDeliveries,
  resendWebhookDelivery,
  type WebhookDelivery,
} from "./api";

type Props = {
  applicationId: string;
  onUnauthorized: () => void;
  channel?: "team" | "partner";
  /** Resend needs the CSRF token and a role that manages integrations. */
  csrfToken?: string;
  canResend?: boolean;
  onOpenDocumentation?: () => void;
};

export function WebhookDeliveries({
  applicationId,
  onUnauthorized,
  channel = "team",
  csrfToken,
  canResend: resendAllowed = false,
  onOpenDocumentation,
}: Props) {
  const [confirmResend, setConfirmResend] = useState(false);
  const [resendNotice, setResendNotice] = useState("");
  const [items, setItems] = useState<WebhookDelivery[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<WebhookDelivery | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequestRef = useRef(0);
  const detailPanelRef = useRef<HTMLElement>(null);
  const lastOpenedId = useRef<string | null>(null);

  useDialogFocus(detailOpen, detailPanelRef, closeDetail, {
    returnFocus: () =>
      document.querySelector<HTMLElement>(
        `[data-row-id="${lastOpenedId.current}"]`,
      ),
  });

  function closeDetail() {
    detailRequestRef.current += 1;
    setDetailOpen(false);
    setSelected(null);
    setDetailLoading(false);
    setDetailError("");
  }

  useEffect(() => {
    let live = true;
    listApplicationWebhookDeliveries(
      applicationId,
      { status: filter === "all" ? undefined : filter },
      channel,
    )
      .then((result) => {
        if (live) {
          setItems(result.items);
          setCursor(result.next_cursor);
        }
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError("Não foi possível consultar as entregas. Tente atualizar.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [applicationId, filter, onUnauthorized, channel]);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const result = await listApplicationWebhookDeliveries(
        applicationId,
        { status: filter === "all" ? undefined : filter },
        channel,
      );
      setItems(result.items);
      setCursor(result.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError("Não foi possível atualizar as entregas.");
    } finally {
      setBusy(false);
    }
  }

  async function resend(reason: string) {
    if (!selected || !csrfToken) return;
    setBusy(true);
    setDetailError("");
    try {
      const result = await resendWebhookDelivery(
        applicationId,
        selected.id,
        reason,
        csrfToken,
        channel,
      );
      setSelected(result);
      setResendNotice(
        "Reenvio solicitado. O sistema confere a conexão antes de tentar de novo.",
      );
      await refresh();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setDetailError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível pedir o reenvio.",
        );
    } finally {
      setConfirmResend(false);
      setBusy(false);
    }
  }

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);
    setError("");
    try {
      const result = await listApplicationWebhookDeliveries(
        applicationId,
        { before: cursor, status: filter === "all" ? undefined : filter },
        channel,
      );
      setItems((current) => [...current, ...result.items]);
      setCursor(result.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError("Não foi possível carregar mais entregas.");
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id: string) {
    setResendNotice("");
    const request = ++detailRequestRef.current;
    lastOpenedId.current = id;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setSelected(null);
    try {
      const result = await getApplicationWebhookDelivery(
        applicationId,
        id,
        channel,
      );
      if (request === detailRequestRef.current) setSelected(result);
    } catch (cause) {
      if (request !== detailRequestRef.current) return;
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setDetailError("Não foi possível abrir esta entrega.");
    } finally {
      if (request === detailRequestRef.current) setDetailLoading(false);
    }
  }

  const metrics = summarizeDeliveries(items);
  const [kind, setKind] = useState<DeliveryKind>("all");
  const shownItems = items.filter(
    (item) =>
      kind === "all" || (kind === "test" ? item.is_test : !item.is_test),
  );
  const maxLatency = Math.max(
    1,
    ...shownItems.map((item) => item.duration_ms ?? 0),
  );
  const counts: Record<string, number> = {
    all: items.length,
    attempted: items.filter((item) => item.status === "attempted").length,
    delivered: items.filter((item) => item.status === "delivered").length,
    unknown: items.filter((item) => item.status === "unknown").length,
    skipped: items.filter((item) => item.status === "skipped").length,
  };
  return (
    <section className="cred" aria-labelledby="delivery-title">
      <header className="cred-head">
        <div>
          <h3 className="appws-section-title" id="delivery-title">
            Entregas
          </h3>
          <p className="form-hint">
            Eventos enviados para esta aplicação, com resposta e tempo de
            entrega.
          </p>
          {channel === "partner" && onOpenDocumentation && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onOpenDocumentation}
            >
              Entender retries e idempotência
            </button>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          Atualizar
        </button>
      </header>
      {!loading && !error && items.length > 0 && (
        <DeliveryCharts
          items={items}
          note={
            filter === "all"
              ? ""
              : ` (filtro: ${filters.find((item) => item.value === filter)?.label})`
          }
        />
      )}
      <WebhookDeliveryFilters
        filter={filter}
        kind={kind}
        showCounts={filter === "all" && !cursor}
        counts={counts}
        onFilter={(value) => {
          setLoading(true);
          setError("");
          setItems([]);
          setCursor(null);
          setSelected(null);
          setFilter(value);
        }}
        onKind={setKind}
      />
      {!loading && !error && items.length > 0 && (
        <p className="form-hint" role="status">
          {metrics.total} entregas carregadas · {metrics.delivered} entregues ·{" "}
          {metrics.problems} com problema
          {metrics.averageMs !== null
            ? ` · ${metrics.averageMs} ms de média`
            : ""}
        </p>
      )}
      {loading ? (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando entregas"
        >
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : shownItems.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhuma entrega encontrada</strong>
          <span>
            {filter === "all" && kind === "all"
              ? "Os eventos enviados aparecerão aqui quando houver atividade."
              : "Não há entregas com este filtro."}
          </span>
        </div>
      ) : (
        <>
          <WebhookDeliveryFeed
            items={shownItems}
            maxLatency={maxLatency}
            selectedId={detailOpen ? lastOpenedId.current : null}
            onOpen={(id) => void openDetail(id)}
          />
          {cursor && (
            <button
              className="btn btn-secondary btn-md cred-more"
              type="button"
              disabled={busy}
              onClick={() => void loadMore()}
            >
              {busy ? "Carregando…" : "Carregar mais"}
            </button>
          )}
        </>
      )}
      <WebhookDeliveryDetailPanel
        open={detailOpen}
        panelRef={detailPanelRef}
        selected={selected}
        loading={detailLoading}
        error={detailError}
        notice={resendNotice}
        busy={busy}
        resendAllowed={resendAllowed}
        csrfToken={csrfToken}
        onClose={closeDetail}
        onResend={() => setConfirmResend(true)}
      />
      <ConfirmDialog
        open={confirmResend}
        title="Reenviar este evento?"
        description="O evento volta para a fila e o destino recebe uma nova tentativa."
        details={
          selected
            ? [
                { label: "Evento", value: eventLabel(selected.event_type) },
                { label: "Identificador", value: selected.id },
              ]
            : []
        }
        confirmLabel="Reenviar evento"
        busy={busy}
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 10,
          max: 500,
        }}
        onConfirm={(reason) => void resend(reason)}
        onCancel={() => setConfirmResend(false)}
      />
    </section>
  );
}
