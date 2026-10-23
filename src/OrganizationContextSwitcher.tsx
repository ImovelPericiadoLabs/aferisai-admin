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
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

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
    firstOptionRef.current?.focus();
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
    async function loadAvailable() {
      try {
        const available: OrganizationListItem[] = [];
        const seen = new Set<string>();
        let cursor: string | undefined;
        while (live) {
          const page = await listOrganizations("", cursor);
          if (!live) return;
          available.push(...page.items);
          setItems([...available]);
          if (!page.next_cursor || seen.has(page.next_cursor)) break;
          seen.add(page.next_cursor);
          cursor = page.next_cursor;
        }
        if (live) setError("");
      } catch (cause) {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError("Não foi possível carregar as empresas autorizadas.");
      } finally {
        if (live) setLoading(false);
      }
    }
    void loadAvailable();
    return () => {
      live = false;
    };
  }, [open, onUnauthorized]);

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
          if (!open) {
            setItems([]);
            setError("");
            setLoading(true);
          }
          setOpen((current) => !current);
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
          <span className="organization-context-heading">
            Selecionar empresa
          </span>
          <div
            className="organization-context-options"
            role="group"
            aria-label="Empresas disponíveis"
          >
            <button
              ref={firstOptionRef}
              type="button"
              aria-pressed={!selectedId}
              onClick={() => choose(null)}
            >
              <span>Todas as parcerias</span>
              {!selectedId && <span aria-hidden="true">✓</span>}
            </button>
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={selectedId === item.id}
                onClick={() => choose(item)}
              >
                <span>{item.name}</span>
                {selectedId === item.id && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
          {loading && <p role="status">Carregando empresas…</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p>Nenhuma empresa disponível.</p>
          )}
        </div>
      )}
    </div>
  );
}
