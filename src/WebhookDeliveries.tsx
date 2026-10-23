import { useEffect, useState } from "react";
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

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
    setDetailLoading(true);
    setDetailError("");
    setSelected(null);
    try {
      setSelected(
        await getApplicationWebhookDelivery(applicationId, id, channel),
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setDetailError("Não foi possível abrir esta entrega.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="delivery-page" aria-labelledby="delivery-title">
      <div className="integration-toolbar">
        <div>
          <h4 id="delivery-title">Entregas</h4>
          <p>
            Eventos enviados para esta aplicação, com resposta e tempo de
            entrega.
          </p>
        </div>
        <button
          className="button secondary"
          type="button"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          Atualizar
        </button>
      </div>
      <div
        className="delivery-filters"
        role="group"
        aria-label="Filtrar entregas"
      >
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
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
      {loading ? (
        <div
          className="integration-skeleton"
          role="status"
          aria-label="Carregando entregas"
        >
          <i />
          <i />
          <i />
        </div>
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <div className="delivery-empty">
          <strong>Nenhuma entrega encontrada</strong>
          <p>
            {filter === "all"
              ? "Os eventos enviados aparecerão aqui quando houver atividade."
              : "Não há entregas com este estado."}
          </p>
        </div>
      ) : (
        <>
          <div className="delivery-list" aria-label="Lista de entregas">
            <div className="delivery-row delivery-header" aria-hidden="true">
              <span>Evento</span>
              <span>Estado</span>
              <span>Resposta</span>
              <span>Horário</span>
              <span />
            </div>
            {items.map((delivery) => (
              <button
                className="delivery-row"
                type="button"
                key={delivery.id}
                onClick={() => void openDetail(delivery.id)}
              >
                <span>
                  <strong>{eventLabel(delivery.event_type)}</strong>
                  <small>
                    {delivery.is_test ? "Teste assinado" : "Evento real"}
                  </small>
                </span>
                <span className={`delivery-badge state-${delivery.status}`}>
                  {delivery.status === "delivered"
                    ? "✓"
                    : delivery.status === "attempted"
                      ? "!"
                      : delivery.status === "skipped"
                        ? "–"
                        : "◷"}{" "}
                  {deliveryLabel(delivery.status)}
                </span>
                <span>
                  {delivery.http_status
                    ? `HTTP ${delivery.http_status}`
                    : "Sem resposta"}
                </span>
                <span>
                  {dateLabel(delivery.attempted_at || delivery.created_at)}
                </span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
          {cursor && (
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => void loadMore()}
            >
              {busy ? "Carregando…" : "Carregar mais"}
            </button>
          )}
        </>
      )}
      {(selected || detailLoading || detailError) && (
        <div className="delivery-scrim" onClick={() => setSelected(null)}>
          <aside
            className="delivery-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delivery-drawer-head">
              <div>
                <small>Entrega</small>
                <h4 id="delivery-detail-title">
                  {selected
                    ? eventLabel(selected.event_type)
                    : "Detalhe da entrega"}
                </h4>
              </div>
              <button
                type="button"
                aria-label="Fechar detalhe"
                onClick={() => {
                  setSelected(null);
                  setDetailError("");
                }}
              >
                ×
              </button>
            </div>
            {detailLoading ? (
              <div
                className="integration-skeleton"
                role="status"
                aria-label="Carregando detalhe"
              >
                <i />
                <i />
              </div>
            ) : detailError ? (
              <p className="error" role="alert">
                {detailError}
              </p>
            ) : (
              selected && (
                <>
                  <span className={`delivery-badge state-${selected.status}`}>
                    {deliveryLabel(selected.status)}
                  </span>
                  <dl className="delivery-detail-list">
                    <div>
                      <dt>Destino</dt>
                      <dd>{selected.endpoint_url}</dd>
                    </div>
                    <div>
                      <dt>Resposta</dt>
                      <dd>
                        {selected.http_status
                          ? `HTTP ${selected.http_status}`
                          : "Sem resposta confirmada"}
                      </dd>
                    </div>
                    <div>
                      <dt>Duração</dt>
                      <dd>
                        {selected.duration_ms == null
                          ? "Não medida"
                          : `${selected.duration_ms} ms`}
                      </dd>
                    </div>
                    <div>
                      <dt>Horário</dt>
                      <dd>
                        {dateLabel(
                          selected.attempted_at || selected.created_at,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Identificador</dt>
                      <dd>{selected.id}</dd>
                    </div>
                  </dl>
                  <p className="delivery-safe-note">
                    O detalhe técnico não expõe a chave de assinatura nem dados
                    pessoais do evento.
                  </p>
                </>
              )
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
