import { useEffect, useState } from "react";
import { ApiError, listTeamUsers, type TeamUser } from "./api";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function Users({
  canRead,
  onUnauthorized,
}: {
  canRead: boolean;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<TeamUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  function handleError(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
    else if (cause instanceof ApiError && cause.status === 403)
      setError("Permissão insuficiente para consultar usuários.");
    else if (cause instanceof ApiError && cause.status === 503)
      setError("Serviço temporariamente indisponível. Tente novamente.");
    else
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível consultar os usuários.",
      );
  }

  async function load(cursor?: string, filter?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await listTeamUsers(cursor, filter || undefined);
      setItems((current) =>
        cursor ? [...current, ...result.items] : result.items,
      );
      setNextCursor(result.next_cursor);
    } catch (cause) {
      handleError(cause);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    let live = true;
    void listTeamUsers()
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        setNextCursor(result.next_cursor);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        handleError(cause);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  if (!canRead)
    return (
      <p className="error" role="alert">
        Este papel não pode consultar usuários.
      </p>
    );

  function changeFilter(value: string) {
    setStatusFilter(value);
    void load(undefined, value);
  }

  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Titulares</p>
          <h1>Usuários</h1>
          <p className="muted">Contas cadastradas na plataforma.</p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void load(undefined, statusFilter)}
        >
          Atualizar
        </button>
      </header>

      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <label
          htmlFor="status-filter"
          style={{ fontSize: "0.8rem", fontWeight: 700 }}
        >
          Estado
        </label>
        <select
          id="status-filter"
          className="input"
          style={{ maxWidth: "200px" }}
          value={statusFilter}
          onChange={(e) => changeFilter(e.target.value)}
          disabled={loading}
        >
          <option value="">Todos</option>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
        </select>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <div
          className="skeleton-rows"
          role="status"
          aria-label="Carregando usuários"
        >
          {[0.55, 0.8, 0.65, 0.7, 0.6].map((w, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr auto auto",
                gap: "1rem",
                padding: "0.9rem 1rem",
                borderBottom: "1px solid var(--line)",
              }}
            >
              {[0.7, w, 0.4, 0.5].map((ww, j) => (
                <div
                  key={j}
                  className="skeleton"
                  style={{ height: "0.85rem", width: `${ww * 100}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      ) : !error && items.length === 0 ? (
        <div className="empty-state">
          <p>
            Nenhum usuário encontrado
            {statusFilter ? " com esse estado" : ""}.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" aria-label="Usuários">
            <thead>
              <tr>
                <th>ID</th>
                <th>E-mail</th>
                <th>Estado</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <code
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "ui-monospace, monospace",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.id}
                    </code>
                  </td>
                  <td>{item.email}</td>
                  <td>
                    <span
                      className={`badge ${item.status === "active" ? "badge-green" : "badge-red"}`}
                    >
                      {item.status === "active" ? "Ativo" : "Suspenso"}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(item.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && items.length > 0 && (
        <p className="directory-state" role="status">
          Atualizando…
        </p>
      )}

      {nextCursor && (
        <button
          type="button"
          className="button secondary"
          disabled={loading}
          style={{ marginTop: "1rem" }}
          onClick={() => void load(nextCursor, statusFilter)}
        >
          {loading ? "Carregando…" : "Mais"}
        </button>
      )}
    </div>
  );
}
