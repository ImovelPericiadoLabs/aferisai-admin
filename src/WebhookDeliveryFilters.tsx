import { filters, type Filter } from "./webhook-deliveries-model";

export type DeliveryKind = "all" | "real" | "test";

const kinds = [
  { value: "all", label: "Todas" },
  { value: "real", label: "Eventos reais" },
  { value: "test", label: "Testes" },
] as const;

export function WebhookDeliveryFilters({
  filter,
  kind,
  showCounts,
  counts,
  onFilter,
  onKind,
}: {
  filter: Filter;
  kind: DeliveryKind;
  showCounts: boolean;
  counts: Record<string, number>;
  onFilter: (value: Filter) => void;
  onKind: (value: DeliveryKind) => void;
}) {
  return (
    <div className="dfilters">
      <div className="seg" role="group" aria-label="Filtrar por estado">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            className="seg-item"
            data-status={item.value}
            aria-pressed={filter === item.value}
            onClick={() => {
              if (item.value === filter) return;
              onFilter(item.value);
            }}
          >
            <span className="seg-dot" aria-hidden="true" />
            {item.label}
            {showCounts && counts[item.value] !== undefined && (
              <span className="seg-count">{counts[item.value]}</span>
            )}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="Filtrar por tipo">
        {kinds.map((item) => (
          <button
            key={item.value}
            type="button"
            className="seg-item"
            aria-pressed={kind === item.value}
            onClick={() => onKind(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
