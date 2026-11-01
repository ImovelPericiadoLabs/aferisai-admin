import type { OnrPreviewAttentionItem } from "./api";
import { decisionLabel } from "./display-labels";
import { dateTime } from "./onr-preview-format";
import { shortId } from "./onr-review-model";

export function OnrPreviewQueue({
  items,
  selectedId,
  cursor,
  loading,
  listError,
  onRetry,
  onOpen,
  onMore,
}: {
  items: OnrPreviewAttentionItem[];
  selectedId: string | null;
  cursor: string | null;
  loading: boolean;
  listError: string;
  onRetry: () => void;
  onOpen: (item: OnrPreviewAttentionItem) => void;
  onMore: (cursor: string) => void;
}) {
  return (
    <aside className="onr-rv-queue" aria-label="Fila de tentativas">
      {listError && (
        <div className="error-state" role="alert">
          <strong>Não foi possível carregar a fila</strong>
          <span>{listError}</span>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => onRetry()}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {loading && items.length === 0 && !listError && (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando fila"
        >
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      )}
      {!loading && items.length === 0 && !listError && (
        <div className="empty-state" role="status">
          <strong>Nenhuma prévia aguardando revisão</strong>
          <span>As tentativas incertas aparecem aqui assim que existirem.</span>
        </div>
      )}
      <ul className="onr-rv-cards">
        {items.map((item) => (
          <li key={item.attempt_id}>
            <button
              type="button"
              className="onr-rv-card"
              aria-pressed={selectedId === item.attempt_id}
              onClick={() => onOpen(item)}
            >
              <span className="onr-rv-card-top">
                <strong>{dateTime.format(new Date(item.started_at))}</strong>
                <span
                  className={`badge ${item.latest_decision ? "badge-info" : "badge-warning"}`}
                >
                  {item.latest_decision
                    ? decisionLabel(item.latest_decision)
                    : "Sem revisão"}
                </span>
              </span>
              <span className="onr-rv-card-sub">
                Tentativa <code>{shortId(item.attempt_id)}</code>
                {item.review_version ? ` · versão ${item.review_version}` : ""}
              </span>
              <span className="onr-rv-card-sub">
                Pedido <code>{shortId(item.operation_id)}</code>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {cursor && (
        <button
          type="button"
          className="btn btn-secondary btn-md"
          disabled={loading}
          onClick={() => onMore(cursor)}
        >
          Carregar mais
        </button>
      )}
    </aside>
  );
}
