import type { RefObject } from "react";
import { BottomSheet } from "./OpsParts";
import { SOURCE_FILTERS } from "./registry-requests-model";

export function RegistryFilterSheet({
  open,
  source,
  sheetTrigger,
  onClose,
  onSourceChange,
}: {
  open: boolean;
  source: string;
  sheetTrigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSourceChange: (value: string) => void;
}) {
  return (
    <BottomSheet
      open={open}
      title="Filtros"
      onClose={onClose}
      returnFocus={() => sheetTrigger.current}
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={() => {
              onSourceChange("");
              onClose();
            }}
          >
            Limpar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={onClose}
          >
            Ver resultados
          </button>
        </>
      }
    >
      <div className="form-field">
        <label className="form-field-label" htmlFor="reg-source-sheet">
          Fonte
        </label>
        <select
          id="reg-source-sheet"
          className="input"
          value={source}
          onChange={(event) => onSourceChange(event.target.value)}
        >
          {SOURCE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </BottomSheet>
  );
}
