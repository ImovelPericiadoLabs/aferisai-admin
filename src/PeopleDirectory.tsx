import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDialogFocus } from "./useDialogFocus";
import { teamRoleLabel } from "./display-labels";
import {
  filterPeople,
  SEARCH_LOAD_CAP,
  shouldLoadMoreForSearch,
  type PeopleTab,
  type Person,
} from "./people-model";
import { PeopleDetailPanel } from "./PeopleDetailPanel";
import { PeopleTable } from "./PeopleTable";
import "./people-directory.css";

type Props = {
  title: string;
  subtitle: string;
  tabs: PeopleTab[];
  activeTab: PeopleTab["page"];
  onTab: (page: PeopleTab["page"]) => void;
  people: Person[];
  showRole: boolean;
  loading: boolean;
  error: string;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  serverStatusFilter?: { value: string; onChange: (value: string) => void };
  /** Replaces the read-only note in the detail drawer with management actions. */
  renderManagement?: (person: Person) => ReactNode;
  /** Extra control next to the refresh button (for example an invite). */
  headerAction?: ReactNode;
};

export function PeopleDirectory({
  title,
  subtitle,
  tabs,
  activeTab,
  onTab,
  people,
  showRole,
  loading,
  error,
  hasMore,
  onLoadMore,
  onRefresh,
  serverStatusFilter,
  renderManagement,
  headerAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [localStatus, setLocalStatus] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const lastOpened = useRef<string | null>(null);

  const status = serverStatusFilter ? serverStatusFilter.value : localStatus;
  const visible = useMemo(
    () =>
      filterPeople(people, query, serverStatusFilter ? "" : localStatus, role),
    [people, query, serverStatusFilter, localStatus, role],
  );
  const selected = people.find((person) => person.id === selectedId) ?? null;
  const activeCount = people.filter((p) => p.status === "active").length;
  const suspendedCount = people.length - activeCount;
  const filtering = Boolean(query || status || role);

  const searchWantsMore = shouldLoadMoreForSearch({
    query,
    hasMore,
    loading,
    loaded: people.length,
    cap: SEARCH_LOAD_CAP,
  });
  const loadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  });
  useEffect(() => {
    if (searchWantsMore) loadMoreRef.current();
  }, [searchWantsMore, people.length]);

  useDialogFocus(selectedId !== null, panelRef, () => setSelectedId(null), {
    returnFocus: () =>
      document.querySelector<HTMLElement>(
        `[data-row-id="${lastOpened.current}"]`,
      ),
  });

  function changeStatus(value: string) {
    if (serverStatusFilter) serverStatusFilter.onChange(value);
    else setLocalStatus(value);
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="people page" aria-labelledby="people-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="people-title">
            {title}
          </h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="people-header-actions">
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={loading}
            onClick={onRefresh}
          >
            Atualizar
          </button>
          {headerAction}
        </div>
      </header>

      {tabs.length > 1 && (
        <div className="people-tabs" role="tablist" aria-label="Pessoas">
          {tabs.map((tab) => (
            <button
              key={tab.page}
              className={`people-tab${tab.page === activeTab ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={tab.page === activeTab}
              onClick={() => onTab(tab.page)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="people-toolbar">
        <div className="people-search">
          <label className="sr-only" htmlFor="people-query">
            Buscar por e-mail ou ID
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
            id="people-query"
            className="input"
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por e-mail ou ID"
          />
        </div>
        <label className="people-filter">
          <span className="sr-only">Estado</span>
          <select
            className="input"
            value={status}
            disabled={loading && Boolean(serverStatusFilter)}
            onChange={(event) => changeStatus(event.target.value)}
          >
            <option value="">Todos os estados</option>
            <option value="active">Ativos</option>
            <option value="suspended">Suspensos</option>
          </select>
        </label>
        {showRole && (
          <label className="people-filter">
            <span className="sr-only">Papel</span>
            <select
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">Todos os papéis</option>
              {(
                ["administrator", "manager", "financial", "viewer"] as const
              ).map((value) => (
                <option key={value} value={value}>
                  {teamRoleLabel(value)}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="people-count" aria-live="polite">
          {loading && people.length === 0
            ? "Carregando…"
            : error && people.length === 0
              ? ""
              : `${visible.length} de ${people.length} · ${activeCount} ativos · ${suspendedCount} suspensos`}
        </span>
      </div>

      {error && (
        <div className="error-state" role="alert">
          <strong>Não foi possível carregar</strong>
          <span>{error}</span>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={onRefresh}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading && people.length === 0 && !error ? (
        <div className="people-skeleton" role="status" aria-label="Carregando">
          {Array.from({ length: 6 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : !error && visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhum resultado</strong>
          <span>
            {filtering
              ? "Nenhuma conta corresponde aos filtros aplicados."
              : "As contas cadastradas aparecerão aqui."}
          </span>
          {filtering && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => {
                setQuery("");
                setRole("");
                changeStatus("");
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : visible.length > 0 ? (
        <PeopleTable
          title={title}
          visible={visible}
          showRole={showRole}
          selectedId={selectedId}
          onOpen={(id) => {
            lastOpened.current = id;
            setSelectedId(id);
          }}
        />
      ) : null}

      {hasMore && (
        <footer className="people-footer">
          <span>{people.length} registros carregados</span>
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={loading}
            onClick={onLoadMore}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        </footer>
      )}

      <PeopleDetailPanel
        selected={selected}
        panelRef={panelRef}
        copied={copied}
        onCopy={(id) => void copyId(id)}
        onClose={() => setSelectedId(null)}
        renderManagement={renderManagement}
      />
    </section>
  );
}
