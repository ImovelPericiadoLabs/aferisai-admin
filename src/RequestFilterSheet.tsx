import type { RefObject } from "react";
import { BottomSheet } from "./OpsParts";
import { DOCUMENT_FILTERS } from "./request-directory-model";

export function RequestFilterSheet({
  open,
  documentState,
  resultCount,
  sheetTrigger,
  onClose,
  onDocumentStateChange,
}: {
  open: boolean;
  documentState: string;
  resultCount: number;
  sheetTrigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onDocumentStateChange: (value: string) => void;
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
              onDocumentStateChange("");
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
            Ver {resultCount} {resultCount === 1 ? "resultado" : "resultados"}
          </button>
        </>
      }
    >
      <div className="form-field">
        <label className="form-field-label" htmlFor="req-doc-sheet">
          Situação do original
        </label>
        <select
          id="req-doc-sheet"
          className="input"
          value={documentState}
          onChange={(event) => onDocumentStateChange(event.target.value)}
        >
          {DOCUMENT_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </BottomSheet>
  );
}
