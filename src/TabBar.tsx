import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import type { TabBadge } from "./application-overview-model";
import { IntegrationIcon } from "./IntegrationIcon";

export type TabItem = {
  id: string;
  label: string;
  icon: string;
  badge?: TabBadge | null;
};

/**
 * Shared tab bar: icons, sliding indicator, optional status badges, sticky below
 * the top bar, keyboard support. The panel it controls must have `id={panelId}`.
 */
export function TabBar({
  tabs,
  active,
  onChange,
  label,
  idBase,
  panelId,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  label: string;
  idBase: string;
  panelId: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const signature = tabs.map((tab) => tab.id).join("|");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const place = (scroll: boolean) => {
      const current = root.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!current) return;
      root.style.setProperty("--ind-x", `${current.offsetLeft}px`);
      root.style.setProperty("--ind-w", `${current.offsetWidth}px`);
      if (scroll)
        root.scrollTo({
          left:
            current.offsetLeft - (root.clientWidth - current.offsetWidth) / 2,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
    };
    place(true);
    const observer = new ResizeObserver(() => place(false));
    observer.observe(root);
    root
      .querySelectorAll('[role="tab"]')
      .forEach((tab) => observer.observe(tab));
    return () => observer.disconnect();
  }, [active, signature, tabs]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    const index = tabs.findIndex((tab) => tab.id === id);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(tabs[next].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }

  return (
    <div ref={rootRef} className="appws-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`${idBase}-tab-${tab.id}`}
          type="button"
          role="tab"
          className="appws-tab"
          aria-selected={active === tab.id}
          aria-controls={panelId}
          tabIndex={active === tab.id ? 0 : -1}
          onKeyDown={(event) => onKeyDown(event, tab.id)}
          onClick={() => onChange(tab.id)}
        >
          <IntegrationIcon name={tab.icon} size={16} />
          <span>{tab.label}</span>
          {tab.badge && (
            <span
              className="appws-tab-badge"
              data-tone={tab.badge.tone}
              data-dot={tab.badge.label === null}
            >
              <span aria-hidden="true">{tab.badge.label}</span>
              <span className="sr-only">{tab.badge.sr}</span>
            </span>
          )}
        </button>
      ))}
      <span className="appws-tabs-ind" aria-hidden="true" />
    </div>
  );
}
