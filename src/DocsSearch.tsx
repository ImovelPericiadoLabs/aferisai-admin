import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { searchDocs, type DocsSite } from "./docs-model";

/** Search box with a result list. "/" or Ctrl/Cmd+K focuses it; arrows, Enter and Esc drive the list. */
export function DocsSearch({
  site,
  onOpen,
}: {
  site: DocsSite;
  onOpen: (target: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hits = useMemo(() => searchDocs(site, query), [site, query]);
  const showing = open && query.trim().length > 0;

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.isContentEditable);
      const shortcut =
        (event.key === "/" && !typing) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");
      if (!shortcut) return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function choose(index: number) {
    const hit = hits[index];
    if (!hit) return;
    onOpen(hit.sectionId ? `${hit.pageId}#${hit.sectionId}` : hit.pageId);
    setOpen(false);
    setQuery("");
    input.current?.blur();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (showing) event.stopPropagation();
      setOpen(false);
      if (!query) input.current?.blur();
      else setQuery("");
    } else if (event.key === "ArrowDown" && hits.length) {
      event.preventDefault();
      setActive((current) => (current + 1) % hits.length);
    } else if (event.key === "ArrowUp" && hits.length) {
      event.preventDefault();
      setActive((current) => (current - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter" && showing) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div className="dx-search" role="search">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Buscar na documentação
      </label>
      <svg
        className="dx-search-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={input}
        id={`${listId}-input`}
        className="input"
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar: OAuth, webhook, PKCE…"
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={
          showing && hits[active] ? `${listId}-${active}` : undefined
        }
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      <kbd className="dx-kbd" aria-hidden="true">
        /
      </kbd>
      {showing && (
        <ul
          id={listId}
          className="dx-results"
          role="listbox"
          aria-label="Resultados da busca"
        >
          {hits.length === 0 ? (
            <li className="dx-results-empty" role="status">
              Nenhum resultado para “{query.trim()}”. Tente outro termo.
            </li>
          ) : (
            hits.map((hit, index) => (
              <li
                key={`${hit.pageId}#${hit.sectionId ?? ""}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                data-active={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                onMouseEnter={() => setActive(index)}
              >
                <span className="dx-result-path">
                  {hit.group} › {hit.pageTitle}
                  {hit.sectionTitle ? ` › ${hit.sectionTitle}` : ""}
                </span>
                {hit.snippet && (
                  <span className="dx-result-snippet">
                    {hit.snippet.before}
                    <mark>{hit.snippet.match}</mark>
                    {hit.snippet.after}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
