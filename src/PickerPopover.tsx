import type { PickerOption } from "./picker-model";

export function PickerPopover({
  listId,
  options,
  active,
  selectedIds,
  multiple,
  loading,
  failed,
  query,
  hasNext,
  emptyMessage,
  emptyAction,
  limitNote,
  moreBusy,
  onChoose,
  onLoadMore,
}: {
  listId: string;
  options: PickerOption[];
  active: number;
  selectedIds: string[];
  multiple: boolean | undefined;
  loading: boolean;
  failed: boolean | undefined;
  query: string;
  hasNext: boolean;
  emptyMessage: string | undefined;
  emptyAction: { label: string; href: string } | undefined;
  limitNote: string | undefined;
  moreBusy: boolean;
  onChoose: (option: PickerOption) => void;
  onLoadMore: () => void;
}) {
  return (
    <div className="picker-popover">
      <ul
        className="picker-list"
        role="listbox"
        tabIndex={-1}
        id={listId}
        aria-multiselectable={multiple}
      >
        {options.map((option, index) => (
          <li
            key={option.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={selectedIds.includes(option.id)}
            className={`picker-option${index === active ? " active" : ""}`}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onChoose(option)}
          >
            <span>
              <strong>{option.label}</strong>
              {option.hint && <small>{option.hint}</small>}
            </span>
            {selectedIds.includes(option.id) && (
              <span className="picker-check" aria-hidden="true">
                ✓
              </span>
            )}
          </li>
        ))}
      </ul>
      {loading && (
        <p className="picker-status" role="status">
          Buscando…
        </p>
      )}
      {!loading && failed && (
        <p className="picker-status picker-error" role="alert">
          Não foi possível buscar agora.
        </p>
      )}
      {!loading && !failed && options.length === 0 && (
        <>
          <p className="picker-status">
            {!query.trim() && !hasNext && emptyMessage
              ? emptyMessage
              : "Nenhum resultado."}
          </p>
          {!query.trim() && !hasNext && emptyAction && (
            <a className="picker-empty-action" href={emptyAction.href}>
              {emptyAction.label}
            </a>
          )}
        </>
      )}
      {hasNext && (
        <button
          className="picker-more"
          type="button"
          disabled={moreBusy}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onLoadMore()}
        >
          {moreBusy ? "Carregando…" : "Carregar mais resultados"}
        </button>
      )}
      {limitNote && !loading && hasNext && (
        <p className="picker-note">{limitNote}</p>
      )}
    </div>
  );
}
