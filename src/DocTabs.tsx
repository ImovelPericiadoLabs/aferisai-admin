import { useRef, type KeyboardEvent } from "react";
import { nextTabIndex } from "./webhook-docs-model";
import "./doc-tabs.css";

/** Underlined tab list with the keyboard model of the ARIA tabs pattern (roving tabindex). */
export function DocTabs<T extends string>({
  label,
  items,
  value,
  onChange,
  idPrefix,
  size = "md",
}: {
  label: string;
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  idPrefix: string;
  size?: "md" | "sm";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    items.findIndex((item) => item.id === value),
  );

  function onKeyDown(event: KeyboardEvent) {
    const next = nextTabIndex(current, event.key, items.length);
    if (next === null) return;
    event.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      className="doc-tabs"
      data-size={size}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${item.id}`}
          aria-selected={item.id === value}
          aria-controls={`${idPrefix}-panel-${item.id}`}
          tabIndex={item.id === value ? 0 : -1}
          className="doc-tab"
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
