import { tabs } from "./promotions-format";
import type { PromotionState } from "./promotion-model";

export function PromotionsToolbar({
  error,
  showError,
  loadFailed,
  notice,
  filter,
  counts,
  onRetry,
  onFilter,
}: {
  error: string;
  showError: boolean;
  loadFailed: boolean;
  notice: string;
  filter: "" | PromotionState;
  counts: Record<"all" | PromotionState, number>;
  onRetry: () => void;
  onFilter: (value: "" | PromotionState) => void;
}) {
  return (
    <>
      {error && showError && (
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
      {notice && (
        <div className="alert alert-success rules-alert" role="status">
          {notice}
        </div>
      )}

      <div className="rules-toolbar">
        <div
          className="rules-tabs"
          role="group"
          aria-label="Filtrar por estado"
        >
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className="rules-tab"
              aria-pressed={filter === tab.value}
              onClick={() => onFilter(tab.value)}
            >
              {tab.label}
              <span className="rules-tab-count">
                {counts[tab.value === "" ? "all" : tab.value]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
