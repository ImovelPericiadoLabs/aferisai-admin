import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  getOrganization,
  listOrganizations,
  type OrganizationDetail,
  type OrganizationListItem,
} from "./api";
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
  const tone =
    status === "active"
      ? "badge-success"
      : status === "suspended"
        ? "badge-warning"
        : "badge-neutral";
  return <span className={`badge ${tone}`}>{statusLabel(status)}</span>;
}

type DetailState = {
  id: string;
  data?: OrganizationDetail;
  error?: string;
};

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getOrganization(selectedId)
      .then((data) => {
        if (active) setDetailState({ id: selectedId, data });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setDetailState({
            id: selectedId,
            error:
              cause instanceof ApiError
                ? cause.detail
                : "Não foi possível carregar o resumo do parceiro.",
          });
      });
    return () => {
      active = false;
    };
  }, [selectedId, detailRevision, onUnauthorized]);

  useEffect(() => {
    if (!selectedId) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const detail = detailState?.id === selectedId ? detailState : null;
  const activeApplications =
    detail?.data?.applications.filter((app) => app.status === "active")
      .length ?? 0;

  function openSummary(id: string) {
    setDetailState(null);
    setSelectedId(id);
  }

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
      className="partner-dir page"
      aria-labelledby="partner-directory-title"
    >
      <header className="page-header">
        <div>
          <h1 className="page-title" id="partner-directory-title">
            Parceiros
          </h1>
          <p className="page-subtitle">
            Consulte parcerias, veja um resumo e abra as aplicações vinculadas.
          </p>
        </div>
        {onCreate && (
          <button
            className="btn btn-primary btn-md"
            type="button"
            onClick={onCreate}
          >
            <span aria-hidden="true">＋</span> Novo parceiro
          </button>
        )}
      </header>

      <div className="partner-dir-toolbar">
        <form
          className="partner-dir-search"
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
            className="input"
            type="search"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar parceiro pelo nome"
          />
          <button
            className="btn btn-secondary btn-md"
            type="submit"
            disabled={loading && items.length === 0}
          >
            Buscar
          </button>
        </form>
        <label className="partner-dir-filter">
          <span className="sr-only">Estado</span>
          <select
            className="input"
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
        <span className="partner-dir-count" aria-live="polite">
          {loading && items.length === 0
            ? "Carregando parceiros…"
            : `${items.length} ${items.length === 1 ? "parceiro exibido" : "parceiros exibidos"}`}
        </span>
      </div>

      {error && (
        <div className="error-state" role="alert">
          <strong>Não foi possível carregar os parceiros</strong>
          <span>{error}</span>
          <button
            className="btn btn-secondary btn-sm"
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
          className="partner-dir-skeleton"
          role="status"
          aria-label="Carregando parceiros"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="empty-state" role="status">
          <strong>Nenhum parceiro encontrado</strong>
          <span>
            {query || statusFilter !== "all"
              ? "Altere a busca ou o estado para tentar novamente."
              : "As parcerias cadastradas aparecerão aqui."}
          </span>
          {statusFilter !== "all" && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => changeStatus("all")}
            >
              Ver todos os estados
            </button>
          )}
        </div>
      ) : items.length > 0 ? (
        <div className="data-table-wrap">
          <table className="data-table partner-dir-table">
            <thead>
              <tr>
                <th scope="col">Parceiro</th>
                <th scope="col">Aplicações</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  data-clickable
                  className={item.id === selectedId ? "selected" : undefined}
                  onClick={() => openSummary(item.id)}
                >
                  <td data-label="Parceiro">
                    <button
                      className="partner-dir-name"
                      type="button"
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        event.stopPropagation();
                        openSummary(item.id);
                      }}
                    >
                      <span className="partner-dir-avatar" aria-hidden="true">
                        {item.name.slice(0, 1).toLocaleUpperCase("pt-BR")}
                      </span>
                      <span className="partner-dir-name-text">
                        <strong>{item.name}</strong>
                        <small>{item.slug}</small>
                      </span>
                    </button>
                  </td>
                  <td data-label="Aplicações">{item.applications_count}</td>
                  <td data-label="Estado">
                    <DirectoryStatus status={item.status} />
                  </td>
                  <td data-label="Ações" className="partner-dir-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(item.id);
                      }}
                    >
                      Gerenciar <span aria-hidden="true">→</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {nextCursor && (
        <footer className="partner-dir-footer">
          <span>{items.length} registros carregados</span>
          <button
            className="btn btn-secondary btn-md"
            type="button"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        </footer>
      )}

      {createPortal(
        <>
          {selectedId && (
            <div
              className="detail-panel-overlay"
              onClick={() => setSelectedId(null)}
            />
          )}
          <aside
            className={`detail-panel${selectedId ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-summary-title"
            aria-hidden={!selectedId}
          >
            <div className="detail-panel-header">
              <div className="partner-dir-summary-head">
                <span className="partner-dir-avatar" aria-hidden="true">
                  {(selectedItem?.name ?? "?")
                    .slice(0, 1)
                    .toLocaleUpperCase("pt-BR")}
                </span>
                <div>
                  <h2
                    className="partner-dir-summary-title"
                    id="partner-summary-title"
                  >
                    {selectedItem?.name}
                  </h2>
                  <p className="partner-dir-summary-slug">
                    {selectedItem?.slug}
                  </p>
                </div>
              </div>
              <button
                ref={closeRef}
                className="btn btn-ghost btn-sm"
                type="button"
                aria-label="Fechar resumo"
                onClick={() => setSelectedId(null)}
              >
                ✕
              </button>
            </div>
            <div className="detail-panel-body">
              {selectedItem && (
                <section className="detail-panel-section">
                  <h3 className="detail-panel-section-title">Resumo</h3>
                  <dl className="detail-panel-field">
                    <dt>Estado</dt>
                    <dd>
                      <DirectoryStatus status={selectedItem.status} />
                    </dd>
                    <dt>Aplicações</dt>
                    <dd>{selectedItem.applications_count}</dd>
                    {detail?.data && (
                      <>
                        <dt>Aplicações ativas</dt>
                        <dd>{activeApplications}</dd>
                        <dt>Ações no catálogo</dt>
                        <dd>{detail.data.permissions.length}</dd>
                      </>
                    )}
                  </dl>
                </section>
              )}
              {selectedId && !detail && (
                <div
                  className="partner-dir-skeleton"
                  role="status"
                  aria-label="Carregando resumo"
                >
                  <span className="skeleton" />
                  <span className="skeleton" />
                </div>
              )}
              {detail?.error && (
                <div className="error-state" role="alert">
                  <span>{detail.error}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => {
                      setDetailState(null);
                      setDetailRevision((value) => value + 1);
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {detail?.data && (
                <>
                  <section className="detail-panel-section">
                    <h3 className="detail-panel-section-title">Descrição</h3>
                    <p className="partner-dir-description">
                      {detail.data.description || "Sem descrição cadastrada."}
                    </p>
                  </section>
                  <section className="detail-panel-section">
                    <h3 className="detail-panel-section-title">Aplicações</h3>
                    {detail.data.applications.length === 0 ? (
                      <p className="partner-dir-description">
                        Nenhuma aplicação vinculada.
                      </p>
                    ) : (
                      <ul className="partner-dir-apps">
                        {detail.data.applications.map((app) => (
                          <li key={app.id}>
                            <span>
                              <strong>{app.name}</strong>
                              <small>
                                {app.permissions.length}{" "}
                                {app.permissions.length === 1
                                  ? "permissão"
                                  : "permissões"}
                              </small>
                            </span>
                            <DirectoryStatus status={app.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
            <div className="detail-panel-footer">
              <button
                className="btn btn-primary btn-md"
                type="button"
                disabled={!selectedId}
                onClick={() => selectedId && onSelect(selectedId)}
              >
                Gerenciar parceiro
              </button>
              <button
                className="btn btn-ghost btn-md"
                type="button"
                onClick={() => setSelectedId(null)}
              >
                Fechar
              </button>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </section>
  );
}
