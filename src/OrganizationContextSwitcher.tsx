import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  getOrganization,
  listOrganizations,
  type OrganizationListItem,
} from "./api";
import "./organization-context-switcher.css";

export function OrganizationContextSwitcher({
  selectedId,
  onSelect,
  onUnauthorized,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUnauthorized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Todas as parcerias");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    getOrganization(selectedId)
      .then((organization) => {
        if (live) setName(organization.name);
      })
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        if (live) setName("Parceria selecionada");
      });
    return () => {
      live = false;
    };
  }, [selectedId, onUnauthorized]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const close = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape")
        setOpen(false);
      if (
        event instanceof PointerEvent &&
        !rootRef.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    listOrganizations(query, cursor)
      .then((page) => {
        if (!live) return;
        setItems((previous) =>
          cursor ? [...previous, ...page.items] : page.items,
        );
        setNextCursor(page.next_cursor);
        setError("");
      })
      .catch((cause) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError("Não foi possível carregar as empresas autorizadas.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [open, query, cursor, onUnauthorized]);

  function choose(item: OrganizationListItem | null) {
    setName(item?.name ?? "Todas as parcerias");
    onSelect(item?.id ?? null);
    setOpen(false);
  }

  return (
    <div className="organization-context" ref={rootRef}>
      <button
        type="button"
        className="organization-context-trigger"
        aria-expanded={open}
        aria-controls="organization-context-menu"
        onClick={() => {
          setOpen((current) => !current);
          setLoading(true);
        }}
      >
        <span className="organization-context-mark" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 21V5l8-2v18M12 7l8 2v12M2 21h20M7 8h2m-2 4h2m-2 4h2m6-4h2m-2 4h2" />
          </svg>
        </span>
        <span className="organization-context-name">
          {selectedId ? name : "Todas as parcerias"}
        </span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div
          className="organization-context-menu"
          id="organization-context-menu"
        >
          <label htmlFor="organization-context-search">Trocar empresa</label>
          <input
            ref={searchRef}
            id="organization-context-search"
            type="search"
            value={search}
            placeholder="Buscar empresa"
            onChange={(event) => {
              setSearch(event.target.value);
              setQuery(event.target.value.trim());
              setCursor(undefined);
              setItems([]);
              setLoading(true);
            }}
          />
          <div className="organization-context-options">
            {!query && (
              <button
                type="button"
                aria-current={!selectedId ? "true" : undefined}
                onClick={() => choose(null)}
              >
                Todas as parcerias
              </button>
            )}
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-current={selectedId === item.id ? "true" : undefined}
                onClick={() => choose(item)}
              >
                <strong>{item.name}</strong>
                <small>
                  {item.applications_count}{" "}
                  {item.applications_count === 1 ? "aplicação" : "aplicações"}
                </small>
              </button>
            ))}
          </div>
          {loading && <p role="status">Carregando empresas…</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p>Nenhuma empresa encontrada.</p>
          )}
          {nextCursor && (
            <button
              type="button"
              className="organization-context-more"
              disabled={loading}
              onClick={() => {
                setCursor(nextCursor);
                setLoading(true);
              }}
            >
              Carregar mais
            </button>
          )}
        </div>
      )}
    </div>
  );
}
