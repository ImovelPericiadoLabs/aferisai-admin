import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Density, TablePrefs } from "./ops-model";

export type OpsColumn<T> = {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Plain text of the cell, used by CSV export. */
  text: (row: T) => string;
  align?: "end";
  /** Dropped from the table (not from the cards) below this width. */
  hideBelow?: "tablet";
  /** Cannot be hidden from the column menu. */
  locked?: boolean;
};

export type RowTone = "warn" | "danger";

export function OpsTable<T>({
  label,
  columns,
  rows,
  rowKey,
  hidden,
  density,
  selectedKey,
  onOpen,
  rowTone,
  actions,
  card,
}: {
  label: string;
  columns: OpsColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  hidden: string[];
  density: Density;
  selectedKey: string | null;
  onOpen: (row: T, trigger: HTMLElement) => void;
  rowTone?: (row: T) => RowTone | undefined;
  actions?: (row: T) => ReactNode;
  /** The phone layout: one touch card per row. */
  card: (row: T) => ReactNode;
}) {
  const visible = columns.filter((column) => !hidden.includes(column.id));
  const body = useRef<HTMLTableSectionElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(row, event.currentTarget);
      return;
    }
    const step =
      event.key === "ArrowDown" || event.key === "j"
        ? 1
        : event.key === "ArrowUp" || event.key === "k"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const all = [
      ...(body.current?.querySelectorAll<HTMLElement>("tr[data-row]") ?? []),
    ];
    const index = all.indexOf(event.currentTarget);
    all[index + step]?.focus();
  }

  return (
    <>
      <div className="ops-table-wrap" data-density={density}>
        <table className="ops-table" aria-label={label}>
          <thead>
            <tr>
              {visible.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  data-hide={column.hideBelow}
                  data-align={column.align}
                >
                  {column.label}
                </th>
              ))}
              {actions && (
                <th scope="col" className="ops-actions-col">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody ref={body}>
            {rows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  data-row
                  data-tone={rowTone?.(row)}
                  aria-selected={selectedKey === key}
                  tabIndex={0}
                  onClick={(event) => onOpen(row, event.currentTarget)}
                  onKeyDown={(event) => onKeyDown(event, row)}
                >
                  {visible.map((column) => (
                    <td
                      key={column.id}
                      data-hide={column.hideBelow}
                      data-align={column.align}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {actions && (
                    <td
                      className="ops-actions-col"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {actions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="ops-cards" aria-label={label}>
        {rows.map((row) => {
          const key = rowKey(row);
          return (
            <li key={key}>
              <button
                type="button"
                className="ops-card"
                data-tone={rowTone?.(row)}
                aria-pressed={selectedKey === key}
                onClick={(event) => onOpen(row, event.currentTarget)}
              >
                {card(row)}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Popover for density and column visibility. */
export function OpsViewMenu<T>({
  columns,
  prefs,
  onChange,
}: {
  columns: OpsColumn<T>[];
  prefs: TablePrefs;
  onChange: (next: TablePrefs) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | globalThis.KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof MouseEvent &&
        ref.current?.contains(event.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="ops-menu ops-desktop-only" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary btn-md"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Exibição
      </button>
      {open && (
        <div
          className="ops-menu-panel"
          role="group"
          aria-label="Exibição da tabela"
        >
          <p className="ops-menu-title">Densidade</p>
          <div className="seg" role="group" aria-label="Densidade">
            {(["comfortable", "compact"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className="seg-item"
                aria-pressed={prefs.density === value}
                onClick={() => onChange({ ...prefs, density: value })}
              >
                {value === "comfortable" ? "Confortável" : "Compacta"}
              </button>
            ))}
          </div>
          <p className="ops-menu-title">Colunas</p>
          {columns.map((column) => (
            <label key={column.id} className="ops-menu-check">
              <input
                type="checkbox"
                checked={!prefs.hidden.includes(column.id)}
                disabled={column.locked}
                onChange={(event) =>
                  onChange({
                    ...prefs,
                    hidden: event.target.checked
                      ? prefs.hidden.filter((id) => id !== column.id)
                      : [...prefs.hidden, column.id],
                  })
                }
              />
              {column.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
