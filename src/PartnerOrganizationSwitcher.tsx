import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  listPartnerOrganizations,
  type PartnerOrganization,
} from "./api";
import "./partner-organization-switcher.css";

export function PartnerOrganizationSwitcher({
  activeName,
  activeId,
  disabled,
  onSelect,
  onUnauthorized,
}: {
  activeName: string | null;
  activeId: string | null;
  disabled: boolean;
  onSelect: (organizationId: string) => Promise<void>;
  onUnauthorized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PartnerOrganization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
        const available: PartnerOrganization[] = [];
        const seen = new Set<string>();
        let cursor: string | undefined;
        while (live) {
          const page = await listPartnerOrganizations("", cursor);
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
        else setError("Não foi possível carregar suas empresas.");
      } finally {
        if (live) setLoading(false);
      }
    }
    void loadAvailable();
    return () => {
      live = false;
    };
  }, [open, activeId, onUnauthorized]);

  async function choose(item: PartnerOrganization) {
    if (item.id === activeId) {
      setOpen(false);
      return;
    }
    setError("");
    try {
      await onSelect(item.id);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível trocar de empresa.",
      );
    }
  }

  return (
    <div className="partner-context" ref={rootRef}>
      <button
        type="button"
        className="partner-context-trigger"
        aria-expanded={open}
        aria-controls="partner-context-menu"
        disabled={disabled}
        onClick={() => {
          if (!open) {
            setItems([]);
            setError("");
            setLoading(true);
          }
          setOpen((current) => !current);
        }}
      >
        <span className="partner-context-mark" aria-hidden="true">
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
        <span className="partner-context-name">
          {activeName || "Selecionar empresa"}
        </span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="partner-context-menu" id="partner-context-menu">
          <span className="partner-context-heading">Selecionar empresa</span>
          <div
            className="partner-context-options"
            role="group"
            aria-label="Empresas disponíveis"
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === activeId}
                onClick={() => void choose(item)}
              >
                <span>{item.name}</span>
                {item.id === activeId && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
          {loading && <p role="status">Carregando empresas…</p>}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {!loading && !error && items.length === 0 && (
            <p>Nenhuma empresa disponível.</p>
          )}
        </div>
      )}
    </div>
  );
}
