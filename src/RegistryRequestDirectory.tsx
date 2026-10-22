import { useEffect, useState } from "react";
import {
  ApiError,
  listTeamRegistryRequests,
  type TeamRegistryRequestPage,
} from "./api";
import "./commercial-policies.css";

type RegistryItem = TeamRegistryRequestPage["items"][number];

const sourceLabels: Record<string, string> = {
  number: "Número/CNM",
  address: "Endereço",
};

const productLabels: Record<string, string> = {
  inteiro_teor_simples: "Inteiro teor simples",
  inteiro_teor: "Inteiro teor",
  visualizacao: "Visualização",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  awaiting_input: "Aguardando",
  dispatched: "Despachado",
  confirmed: "Confirmado",
  unavailable: "Indisponível",
  failed: "Falhou",
  unknown: "Incerto",
};

function statusClass(status: string): string {
  if (status === "confirmed") return "pill success";
  if (status === "dispatched") return "pill";
  if (status === "failed" || status === "unknown") return "pill error";
  if (status === "unavailable") return "pill warning";
  return "pill secondary";
}

export function RegistryRequestDirectory({
  onUnauthorized,
}: {
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");

  async function load(cursor?: string, status?: string, source?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await listTeamRegistryRequests({
        cursor,
        status: status || undefined,
        source: source || undefined,
      });
      setItems((current) =>
        cursor ? [...current, ...result.items] : result.items,
      );
      setNextCursor(result.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível consultar os pedidos.",
        );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let live = true;
    void listTeamRegistryRequests({})
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        setNextCursor(result.next_cursor);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar os pedidos.",
          );
      });
    return () => {
      live = false;
    };
  }, [onUnauthorized]);

  function applyFilters() {
    setItems([]);
    setNextCursor(null);
    void load(undefined, filterStatus, filterSource);
  }

  return (
    <div className="content commercial-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Triagem operacional</p>
          <h1>Pedidos registrais</h1>
          <p className="muted">
            Acompanhe os pedidos por número/CNM e endereço. Um estado pendente
            não comprova cotação aprovada, pagamento ou compra no fornecedor.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => {
            setItems([]);
            setNextCursor(null);
            void load(undefined, filterStatus, filterSource);
          }}
        >
          Atualizar
        </button>
      </header>

      <div className="workspace">
        <div className="form-panel" aria-label="Filtros">
          <p className="eyebrow">Filtros</p>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              Estado
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6 }}
              >
                <option value="">Todos</option>
                <option value="pending">Pendente</option>
                <option value="awaiting_input">Aguardando dados</option>
                <option value="dispatched">Despachado</option>
                <option value="confirmed">Confirmado</option>
                <option value="unknown">Incerto</option>
                <option value="failed">Falhou</option>
                <option value="unavailable">Indisponível</option>
              </select>
            </label>
            <label>
              Fonte
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6 }}
              >
                <option value="">Todas</option>
                <option value="number">Número/CNM</option>
                <option value="address">Endereço</option>
              </select>
            </label>
            <button
              className="button primary"
              disabled={loading}
              onClick={applyFilters}
            >
              Filtrar
            </button>
          </div>
        </div>

        <div className="side-panel">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!error && items.length === 0 && !loading && (
            <p className="muted">Nenhum pedido registral encontrado.</p>
          )}
          {items.length > 0 && (
            <ul className="commercial-list" aria-label="Pedidos registrais">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="commercial-list-head">
                    <span
                      className="muted"
                      style={{ fontFamily: "monospace", fontSize: 12 }}
                    >
                      {item.id.slice(0, 8)}…
                    </span>
                    <span className={statusClass(item.status)}>
                      {statusLabels[item.status] ?? item.status}
                    </span>
                  </div>
                  <p>
                    <strong>{sourceLabels[item.source] ?? item.source}</strong>
                    {" · "}
                    {productLabels[item.product] ?? item.product}
                    {" · "}
                    {item.item_count} {item.item_count === 1 ? "item" : "itens"}
                  </p>
                  <small>
                    Titular {item.owner_user_id.slice(0, 8)}…{" · "}
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </small>
                </li>
              ))}
            </ul>
          )}
          {loading && <p className="muted">Carregando…</p>}
          {nextCursor && !loading && (
            <button
              className="button secondary"
              onClick={() => void load(nextCursor, filterStatus, filterSource)}
            >
              Carregar mais
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
