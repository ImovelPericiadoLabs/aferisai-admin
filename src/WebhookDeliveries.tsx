import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { summarizeDeliveries } from "./application-overview-model";
import { useDialogFocus } from "./useDialogFocus";
import {
  ApiError,
  getApplicationWebhookDelivery,
  listApplicationWebhookDeliveries,
  type WebhookDelivery,
} from "./api";

type Props = {
  applicationId: string;
  onUnauthorized: () => void;
  channel?: "team" | "partner";
};
type Filter = "all" | "delivered" | "attempted" | "unknown" | "skipped";
const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "attempted", label: "Falhas" },
  { value: "delivered", label: "Entregues" },
  { value: "unknown", label: "Em conferência" },
  { value: "skipped", label: "Não enviadas" },
];

function dateLabel(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}
function eventLabel(value: string): string {
  return value === "webhook.test"
    ? "Evento de teste"
    : value === "analysis.completed"
      ? "Análise concluída"
      : "Evento não identificado";
}
function deliveryTone(value: string): string {
  return value === "delivered"
    ? "badge-success"
    : value === "attempted" || value === "unknown"
      ? "badge-warning"
      : value === "pending"
        ? "badge-info"
        : "badge-neutral";
}
function deliveryLabel(value: string): string {
  return (
    (
      {
        delivered: "Entregue",
        attempted: "Falha",
        unknown: "Em conferência",
        pending: "Aguardando envio",
        skipped: "Não enviada",
      } as Record<string, string>
    )[value] ?? "Estado desconhecido"
  );
}

export function WebhookDeliveries({
  applicationId,
  onUnauthorized,
  channel = "team",
}: Props) {
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

  return (
    <section className="deliv" aria-labelledby="delivery-title">
      <header className="cred-head">
        <div>
          <h3 className="appws-section-title" id="delivery-title">
            Entregas
          </h3>
          <p className="form-hint">
            Eventos enviados para esta aplicação, com resposta e tempo de
            entrega.
          </p>
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
      <div className="rules-tabs" role="group" aria-label="Filtrar entregas">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            className="rules-tab"
            aria-pressed={filter === item.value}
            onClick={() => {
              if (item.value === filter) return;
              setLoading(true);
              setError("");
              setItems([]);
              setCursor(null);
              setSelected(null);
              setFilter(item.value);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
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
      ) : items.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhuma entrega encontrada</strong>
          <span>
            {filter === "all"
              ? "Os eventos enviados aparecerão aqui quando houver atividade."
              : "Não há entregas com este estado."}
          </span>
        </div>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Lista de entregas">
              <thead>
                <tr>
                  <th scope="col">Evento</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Resposta</th>
                  <th scope="col">Horário</th>
                </tr>
              </thead>
              <tbody>
                {items.map((delivery) => (
                  <tr
                    key={delivery.id}
                    data-clickable
                    className={
                      delivery.id === lastOpenedId.current && detailOpen
                        ? "selected"
                        : undefined
                    }
                    onClick={() => void openDetail(delivery.id)}
                  >
                    <td data-label="Evento">
                      <button
                        className="rules-cell-button"
                        data-row-id={delivery.id}
                        type="button"
                        aria-haspopup="dialog"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openDetail(delivery.id);
                        }}
                      >
                        <strong>{eventLabel(delivery.event_type)}</strong>
                        <small>
                          {delivery.is_test ? "Teste assinado" : "Evento real"}
                        </small>
                      </button>
                    </td>
                    <td data-label="Estado">
                      <span
                        className={`badge ${deliveryTone(delivery.status)}`}
                      >
                        {deliveryLabel(delivery.status)}
                      </span>
                    </td>
                    <td data-label="Resposta">
                      {delivery.http_status
                        ? `HTTP ${delivery.http_status}`
                        : "Sem resposta"}
                      {delivery.duration_ms != null && (
                        <small className="rules-cell-sub">
                          {delivery.duration_ms} ms
                        </small>
                      )}
                    </td>
                    <td data-label="Horário">
                      {dateLabel(delivery.attempted_at || delivery.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      {createPortal(
        <>
          {detailOpen && (
            <div className="detail-panel-overlay" onClick={closeDetail} />
          )}
          <aside
            ref={detailPanelRef}
            className={`detail-panel${detailOpen ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-detail-title"
            aria-hidden={!detailOpen}
          >
            {detailOpen && (
              <>
                <div className="detail-panel-header">
                  <div>
                    <h2
                      className="rules-panel-title"
                      id="delivery-detail-title"
                    >
                      {selected
                        ? eventLabel(selected.event_type)
                        : "Detalhe da entrega"}
                    </h2>
                    {selected && (
                      <div className="rules-panel-badges">
                        <span
                          className={`badge ${deliveryTone(selected.status)}`}
                        >
                          {deliveryLabel(selected.status)}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar detalhe"
                    onClick={closeDetail}
                  >
                    ✕
                  </button>
                </div>
                <div className="detail-panel-body">
                  {detailLoading ? (
                    <div
                      className="rules-skeleton"
                      role="status"
                      aria-label="Carregando detalhe"
                    >
                      <span className="skeleton" />
                      <span className="skeleton" />
                    </div>
                  ) : detailError ? (
                    <div className="alert alert-danger" role="alert">
                      {detailError}
                    </div>
                  ) : (
                    selected && (
                      <>
                        <section className="detail-panel-section">
                          <h3 className="detail-panel-section-title">
                            Resultado
                          </h3>
                          <dl className="detail-panel-field">
                            <dt>Destino</dt>
                            <dd>{selected.endpoint_url}</dd>
                            <dt>Resposta</dt>
                            <dd>
                              {selected.http_status
                                ? `HTTP ${selected.http_status}`
                                : "Sem resposta confirmada"}
                            </dd>
                            <dt>Duração</dt>
                            <dd>
                              {selected.duration_ms == null
                                ? "Não medida"
                                : `${selected.duration_ms} ms`}
                            </dd>
                            <dt>Horário</dt>
                            <dd>
                              {dateLabel(
                                selected.attempted_at || selected.created_at,
                              )}
                            </dd>
                            <dt>Tipo</dt>
                            <dd>
                              {selected.is_test
                                ? "Teste assinado"
                                : "Evento real"}
                            </dd>
                            <dt>Identificador</dt>
                            <dd>
                              <code>{selected.id}</code>
                            </dd>
                          </dl>
                        </section>
                        <p className="form-hint">
                          O detalhe técnico não expõe a chave de assinatura nem
                          dados pessoais do evento.
                        </p>
                      </>
                    )
                  )}
                </div>
              </>
            )}
          </aside>
        </>,
        document.body,
      )}
    </section>
  );
}
