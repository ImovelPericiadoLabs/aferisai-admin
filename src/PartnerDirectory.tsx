import { useEffect, useState, type FormEvent } from "react";
import { ApiError, listOrganizations, type OrganizationListItem } from "./api";
import "./partner-directory.css";

type Props = {
  onSelect: (organizationId: string) => void;
  onUnauthorized: () => void;
  onCreate?: () => void;
};

type StatusFilter = "all" | "active" | "suspended";

function statusLabel(status: string): string {
  if (status === "active") return "Ativo";
  if (status === "suspended") return "Suspenso";
  return "Estado não informado";
}

function DirectoryStatus({ status }: { status: string }) {
  return (
    <span
      className={`partner-directory-status partner-directory-status--${status === "active" || status === "suspended" ? status : "unknown"}`}
    >
      <span aria-hidden="true" className="partner-directory-status-dot" />
      {statusLabel(status)}
    </span>
  );
}

export function PartnerDirectory({
  onSelect,
  onUnauthorized,
  onCreate,
}: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    listOrganizations(
      query,
      cursor,
      statusFilter === "all" ? undefined : statusFilter,
    )
      .then((result) => {
        if (!active) return;
        setItems((previous) =>
          cursor ? [...previous, ...result.items] : result.items,
        );
        setNextCursor(result.next_cursor);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar os parceiros. Tente novamente.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, cursor, revision, statusFilter, onUnauthorized]);

  function changeStatus(value: StatusFilter) {
    setItems([]);
    setNextCursor(null);
    setCursor(undefined);
    setError("");
    setLoading(true);
    setStatusFilter(value);
    setRevision((current) => current + 1);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setItems([]);
    setNextCursor(null);
    setCursor(undefined);
    setError("");
    setLoading(true);
    setQuery(search.trim());
    setRevision((value) => value + 1);
  }

  function loadMore() {
    if (!nextCursor || loading) return;
    setCursor(nextCursor);
    setError("");
    setLoading(true);
  }

  return (
    <section
      className="partner-directory"
      aria-labelledby="partner-directory-title"
    >
      <header className="partner-directory-heading">
        <div>
          <p className="eyebrow">Comercial / Parceiros</p>
          <h1 id="partner-directory-title">Parceiros</h1>
          <p>Consulte parcerias e abra as aplicações vinculadas.</p>
        </div>
        {onCreate && (
          <button
            className="button primary partner-directory-create"
            type="button"
            onClick={onCreate}
          >
            <span aria-hidden="true">＋</span> Novo parceiro
          </button>
        )}
      </header>

      <div className="partner-directory-toolbar">
        <form
          className="partner-directory-search"
          role="search"
          onSubmit={submitSearch}
        >
          <label className="sr-only" htmlFor="partner-directory-query">
            Buscar parceiro
          </label>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="10.8" cy="10.8" r="6.3" />
            <path d="m15.5 15.5 4.2 4.2" />
          </svg>
          <input
            id="partner-directory-query"
            type="search"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar parceiro"
          />
          <button type="submit" disabled={loading && items.length === 0}>
            Buscar
          </button>
        </form>
        <label className="partner-directory-filter">
          <span>Estado</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              changeStatus(event.target.value as StatusFilter)
            }
          >
            <option value="all">Todos os estados</option>
            <option value="active">Ativos</option>
            <option value="suspended">Suspensos</option>
          </select>
        </label>
      </div>

      <div className="partner-directory-caption" aria-live="polite">
        <span>
          {loading && items.length === 0
            ? "Carregando parceiros…"
            : `${items.length} ${items.length === 1 ? "parceiro exibido" : "parceiros exibidos"}`}
        </span>
      </div>

      {error && (
        <div className="partner-directory-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div
          className="partner-directory-skeleton"
          role="status"
          aria-label="Carregando parceiros"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="partner-directory-empty" role="status">
          <h2>Nenhum parceiro encontrado</h2>
          <p>
            {query || statusFilter !== "all"
              ? "Altere a busca ou o estado para tentar novamente."
              : "As parcerias cadastradas aparecerão aqui."}
          </p>
          {statusFilter !== "all" && (
            <button
              type="button"
              className="button secondary"
              onClick={() => changeStatus("all")}
            >
              Ver todos os estados
            </button>
          )}
        </div>
      ) : (
        <div className="partner-directory-table-wrap">
          <table className="partner-directory-table">
            <thead>
              <tr>
                <th scope="col">Parceiro</th>
                <th scope="col">Aplicações</th>
                <th scope="col">Estado</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Parceiro">
                    <button
                      className="partner-directory-name"
                      type="button"
                      onClick={() => onSelect(item.id)}
                    >
                      <span
                        className="partner-directory-avatar"
                        aria-hidden="true"
                      >
                        {item.name.slice(0, 1).toLocaleUpperCase("pt-BR")}
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                      </span>
                    </button>
                  </td>
                  <td data-label="Aplicações">
                    <span className="partner-directory-count">
                      {item.applications_count}
                    </span>
                  </td>
                  <td data-label="Estado">
                    <DirectoryStatus status={item.status} />
                  </td>
                  <td data-label="Ações">
                    <button
                      className="partner-directory-open"
                      type="button"
                      onClick={() => onSelect(item.id)}
                    >
                      Abrir <span aria-hidden="true">→</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && (
        <footer className="partner-directory-footer">
          <span>Exibindo {items.length} registros carregados</span>
          <button
            className="button secondary"
            type="button"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        </footer>
      )}
    </section>
  );
}
