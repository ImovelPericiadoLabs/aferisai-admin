import type { CaseFilter } from "./exception-model";
import { tabs } from "./financial-exceptions-format";

export function FinancialExceptionsToolbar({
  error,
  loadFailed,
  notice,
  open,
  filter,
  scope,
  counts,
  onRetry,
  onFilter,
}: {
  error: string;
  loadFailed: boolean;
  notice: string;
  open: boolean;
  filter: CaseFilter;
  scope: "open" | "done";
  counts: Record<CaseFilter, number>;
  onRetry: () => void;
  onFilter: (next: CaseFilter) => void;
}) {
  return (
    <>
      {error && !open && (
        <div className="alert alert-danger rules-alert" role="alert">
          {error}
          {loadFailed && (
            <>
              {" "}
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={onRetry}
              >
                Tentar novamente
              </button>
            </>
          )}
        </div>
      )}
      {notice && !open && (
        <div className="alert alert-success rules-alert" role="status">
          {notice}
        </div>
      )}

      <div className="rules-toolbar">
        <div className="rules-tabs" role="group" aria-label="Filtrar casos">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className="rules-tab"
              aria-pressed={filter === tab.value}
              onClick={() => onFilter(tab.value)}
            >
              {tab.label}
              {(tab.value === "done") === (scope === "done") && (
                <span className="rules-tab-count">{counts[tab.value]}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
