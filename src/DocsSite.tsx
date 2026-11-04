import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocsBlock } from "./DocsBlocks";
import { DocsContext } from "./docs-context";
import { isSampleLanguage } from "./docs-languages";
import {
  buildToc,
  groupedPages,
  prevNext,
  type DocsSite as DocsSiteData,
  type SampleLanguage,
} from "./docs-model";
import { DocsSearch } from "./DocsSearch";
import "./docs.css";

const read = (storage: "localStorage" | "sessionStorage", key: string) => {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
};
const write = (
  storage: "localStorage" | "sessionStorage",
  key: string,
  value: string,
) => {
  try {
    window[storage].setItem(key, value);
  } catch {
    /* private mode or blocked storage: the choice just lasts for this visit */
  }
};

/**
 * Documentation reader: grouped navigation, search, a page with a table of contents that follows the
 * reading position, shared language tabs for code samples and previous/next links. The content is
 * data (see docs-model.ts); `storageKey` keeps one site's remembered choices apart from another's.
 */
export function DocsSite({
  site,
  storageKey,
  footer,
}: {
  site: DocsSiteData;
  storageKey: string;
  footer?: string;
}) {
  const firstPage = site.pages[0]?.id ?? "";
  const [pageId, setPageId] = useState(() => {
    const saved = read("sessionStorage", `${storageKey}.page`);
    return site.pages.some((page) => page.id === saved)
      ? (saved as string)
      : firstPage;
  });
  const [language, setLanguageState] = useState<SampleLanguage>(() => {
    const saved = read("localStorage", `${storageKey}.lang`);
    return isSampleLanguage(saved) ? saved : "curl";
  });
  const [navOpen, setNavOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState("");
  const [navTick, setNavTick] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pendingAnchor = useRef<string | null>(null);
  const groups = useMemo(() => groupedPages(site), [site]);
  const page = site.pages.find((item) => item.id === pageId) ?? site.pages[0];
  const toc = useMemo(() => (page ? buildToc(page) : []), [page]);
  const { prev, next } = useMemo(
    () => prevNext(site, page?.id ?? ""),
    [site, page],
  );
  const groupLabel =
    groups.find((group) => group.id === page?.group)?.label ?? "";

  const setLanguage = useCallback(
    (next: SampleLanguage) => {
      setLanguageState(next);
      write("localStorage", `${storageKey}.lang`, next);
    },
    [storageKey],
  );

  const go = useCallback(
    (target: string) => {
      const [id, anchor] = target.split("#");
      if (!site.pages.some((item) => item.id === id)) return;
      pendingAnchor.current = anchor ?? "";
      setPageId(id);
      setNavTick((tick) => tick + 1);
      setNavOpen(false);
      write("sessionStorage", `${storageKey}.page`, id);
    },
    [site, storageKey],
  );

  // After a page change (or a link to an anchor), scroll to the anchor or to the top of the page.
  useEffect(() => {
    const anchor = pendingAnchor.current;
    if (anchor === null) return;
    pendingAnchor.current = null;
    if (anchor) {
      document
        .getElementById(`dx-${page?.id}-${anchor}`)
        ?.scrollIntoView({ block: "start" });
      setActiveAnchor(anchor);
    } else {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) rootRef.current?.scrollIntoView({ block: "start" });
      titleRef.current?.focus({ preventScroll: true });
      setActiveAnchor("");
    }
  }, [page?.id, navTick]);

  // The table of contents follows the last heading that has reached the upper part of the screen;
  // at the very bottom of the page the last entry wins, since it may never get that high.
  useEffect(() => {
    if (!page) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      let current = toc[0]?.id ?? "";
      for (const item of toc) {
        const node = document.getElementById(`dx-${page.id}-${item.id}`);
        if (node && node.getBoundingClientRect().top <= line) current = item.id;
      }
      if (atBottom && toc.length > 0) current = toc[toc.length - 1].id;
      setActiveAnchor(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [page, toc]);

  const context = useMemo(
    () => ({ language, setLanguage, go }),
    [language, setLanguage, go],
  );
  if (!page) return null;

  return (
    <DocsContext.Provider value={context}>
      <section ref={rootRef} className="dx" aria-label={site.title}>
        <div className="dx-bar">
          <nav className="dx-crumbs" aria-label="Trilha">
            <ol>
              <li>
                <button
                  type="button"
                  className="dx-link"
                  onClick={() => go(firstPage)}
                >
                  {site.title}
                </button>
              </li>
              <li>{groupLabel}</li>
              <li aria-current="page">{page.title}</li>
            </ol>
          </nav>
          <DocsSearch site={site} onOpen={go} />
        </div>

        <div className="dx-body">
          <aside className="dx-nav" aria-label="Tópicos da documentação">
            <button
              type="button"
              className="dx-nav-toggle"
              aria-expanded={navOpen}
              aria-controls="dx-nav-list"
              onClick={() => setNavOpen((value) => !value)}
            >
              <span>
                <small>Neste guia</small>
                {page.title}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div id="dx-nav-list" className="dx-nav-list" data-open={navOpen}>
              {groups.map((group) => (
                <section key={group.id}>
                  <h2>{group.label}</h2>
                  <ul>
                    {group.pages.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={
                            item.id === page.id ? "page" : undefined
                          }
                          onClick={() => go(item.id)}
                        >
                          {item.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </aside>

          <article className="dx-article" aria-labelledby="dx-title">
            <header className="dx-head">
              <h1 id="dx-title" ref={titleRef} tabIndex={-1}>
                {page.title}
              </h1>
              <p className="dx-lead">{page.summary}</p>
              {(page.audience || page.scopes) && (
                <dl className="dx-meta">
                  {page.audience && (
                    <div>
                      <dt>Para</dt>
                      <dd>{page.audience.join(" · ")}</dd>
                    </div>
                  )}
                  {page.scopes && (
                    <div>
                      <dt>Escopos</dt>
                      <dd>
                        {page.scopes.map((scope) => (
                          <code key={scope}>{scope}</code>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </header>

            {toc.length > 2 && (
              <details className="dx-toc-inline">
                <summary>Nesta página</summary>
                <ul>
                  {toc.map((item) => (
                    <li key={item.id} data-level={item.level}>
                      <button
                        type="button"
                        onClick={() => go(`${page.id}#${item.id}`)}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {page.sections.map((section) => (
              <section
                key={section.id}
                className="dx-section"
                aria-labelledby={`dx-${page.id}-${section.id}`}
              >
                <h2 id={`dx-${page.id}-${section.id}`} data-anchor={section.id}>
                  {section.title}
                </h2>
                {section.blocks.map((block, index) => (
                  <DocsBlock
                    key={index}
                    block={block}
                    samples={site.samples}
                    pageId={page.id}
                  />
                ))}
              </section>
            ))}

            <nav className="dx-pager" aria-label="Páginas vizinhas">
              {prev ? (
                <button type="button" onClick={() => go(prev.id)}>
                  <small>Anterior</small>
                  <strong>{prev.title}</strong>
                </button>
              ) : (
                <span />
              )}
              {next ? (
                <button type="button" data-next onClick={() => go(next.id)}>
                  <small>Próxima</small>
                  <strong>{next.title}</strong>
                </button>
              ) : (
                <span />
              )}
            </nav>
            {footer && <p className="dx-footer">{footer}</p>}
          </article>

          {toc.length > 2 && (
            <aside className="dx-toc" aria-label="Nesta página">
              <h2>Nesta página</h2>
              <ul>
                {toc.map((item) => (
                  <li key={item.id} data-level={item.level}>
                    <button
                      type="button"
                      aria-current={
                        activeAnchor === item.id ? "location" : undefined
                      }
                      onClick={() => go(`${page.id}#${item.id}`)}
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </section>
    </DocsContext.Provider>
  );
}
