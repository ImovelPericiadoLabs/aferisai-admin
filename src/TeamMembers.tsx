import { useEffect, useState } from "react";
import { ApiError, listTeamMembers, type TeamMemberListItem } from "./api";
import { teamRoleLabel } from "./display-labels";

const roleBadge: Record<TeamMemberListItem["role"], string> = {
  administrator: "badge-blue",
  manager: "badge-blue",
  viewer: "badge-gray",
  financial: "badge-gray",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function TeamMembers({
  isAdmin,
  onUnauthorized,
}: {
  isAdmin: boolean;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<TeamMemberListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function handleError(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
    else if (cause instanceof ApiError && cause.status === 403)
      setError("Apenas administradores podem consultar membros da equipe.");
    else if (cause instanceof ApiError && cause.status === 503)
      setError("Serviço temporariamente indisponível. Tente novamente.");
    else
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível consultar os membros.",
      );
  }

  async function load(cursor?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await listTeamMembers(cursor);
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
    if (!isAdmin) return;
    let live = true;
    void listTeamMembers()
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
  }, [isAdmin]);

  if (!isAdmin)
    return (
      <p className="error" role="alert">
        Apenas administradores podem acessar a gestão de membros.
      </p>
    );

  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Equipe interna</p>
          <h1>Membros da equipe</h1>
          <p className="muted">Contas internas com acesso ao painel.</p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void load()}
        >
          Atualizar
        </button>
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <div
          className="skeleton-rows"
          role="status"
          aria-label="Carregando membros"
        >
          {[0.6, 0.75, 0.55, 0.7, 0.65].map((w, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr auto auto auto",
                gap: "1rem",
                padding: "0.9rem 1rem",
                borderBottom: "1px solid var(--line)",
              }}
            >
              {[0.6, w, 0.5, 0.4, 0.5].map((ww, j) => (
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
          <p>Nenhum membro encontrado.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" aria-label="Membros da equipe">
            <thead>
              <tr>
                <th>ID</th>
                <th>E-mail</th>
                <th>Papel</th>
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
                    <span className={`badge ${roleBadge[item.role]}`}>
                      {teamRoleLabel(item.role)}
                    </span>
                  </td>
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
          onClick={() => void load(nextCursor)}
        >
          {loading ? "Carregando…" : "Mais"}
        </button>
      )}
    </div>
  );
}
