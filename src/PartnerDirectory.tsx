import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDialogFocus } from "./useDialogFocus";
import {
  ApiError,
  getOrganization,
  listOrganizations,
  type OrganizationListItem,
} from "./api";
import type { DetailState, StatusFilter } from "./partner-directory-model";
import { PartnerDirectoryTable } from "./PartnerDirectoryTable";
import { PartnerSummaryPanel } from "./PartnerSummaryPanel";
import "./partner-directory.css";

type Props = {
  onSelect: (organizationId: string) => void;
  onUnauthorized: () => void;
  onCreate?: () => void;
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
  const panelRef = useRef<HTMLElement>(null);
  const lastOpened = useRef<string | null>(null);

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

  useDialogFocus(selectedId !== null, panelRef, () => setSelectedId(null), {
    returnFocus: () =>
      document.querySelector<HTMLElement>(
        `[data-row-id="${lastOpened.current}"]`,
      ),
  });

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const detail = detailState?.id === selectedId ? detailState : null;
  function openSummary(id: string) {
    lastOpened.current = id;
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
        <PartnerDirectoryTable
          items={items}
          selectedId={selectedId}
          onSummary={openSummary}
          onSelect={onSelect}
        />
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

      <PartnerSummaryPanel
        selectedId={selectedId}
        selectedItem={selectedItem}
        detail={detail}
        panelRef={panelRef}
        onClose={() => setSelectedId(null)}
        onSelect={onSelect}
        onRetry={() => {
          setDetailState(null);
          setDetailRevision((value) => value + 1);
        }}
      />
    </section>
  );
}
