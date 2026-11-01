import { useMemo } from "react";
import { AgeBadge } from "./OpsParts";
import { OpsTable, type OpsColumn } from "./OpsTable";
import { dateTime, shortId } from "./reconciliation-format";
import { reconciliationTone, type UncertainRow } from "./reconciliation-model";

export function ReconciliationTable({
  rows,
  selectedKey,
  now,
  onOpen,
}: {
  rows: UncertainRow[];
  selectedKey: string | null;
  now: number;
  onOpen: (item: UncertainRow, element: HTMLElement) => void;
}) {
  const columns: OpsColumn<UncertainRow>[] = useMemo(
    () => [
      {
        id: "operation",
        label: "Operação",
        locked: true,
        render: (item) => (
          <span className="ops-id">
            <strong>{shortId(item.operation_id)}</strong>
            <small>item {shortId(item.item_id)}</small>
          </span>
        ),
        text: (item) => item.operation_id,
      },
      {
        id: "provider",
        label: "Fornecedor",
        render: (item) => (
          <span className="badge badge-neutral">{item.provider}</span>
        ),
        text: (item) => item.provider,
      },
      {
        id: "attempted",
        label: "Tentada em",
        hideBelow: "tablet",
        render: (item) => dateTime.format(new Date(item.attempted_at)),
        text: (item) => item.attempted_at,
      },
      {
        id: "age",
        label: "Situação",
        align: "end",
        render: (item) =>
          item.reconciliation_status === "refunded_record" ? (
            <span className="badge badge-neutral">Cliente reembolsado</span>
          ) : (
            <AgeBadge
              iso={item.attempted_at}
              now={now}
              warnAfterHours={6}
              dangerAfterHours={24}
            />
          ),
        text: (item) =>
          item.reconciliation_status === "refunded_record"
            ? "Cliente reembolsado"
            : item.attempted_at,
      },
    ],
    [now],
  );

  return (
    <OpsTable
      label="Envios incertos"
      columns={columns}
      rows={rows}
      rowKey={(item) => item.item_id}
      hidden={[]}
      density="comfortable"
      selectedKey={selectedKey}
      rowTone={(item) => reconciliationTone(item, now)}
      actions={(item) => (
        <button
          type="button"
          className={`btn ${item.reconciliation_status === "refunded_record" ? "btn-secondary" : "btn-primary"} btn-sm`}
          onClick={(event) => onOpen(item, event.currentTarget)}
        >
          {item.reconciliation_status === "refunded_record"
            ? "Consultar"
            : "Decidir"}
        </button>
      )}
      onOpen={onOpen}
      card={(item) => (
        <>
          <span className="ops-card-top">
            <strong>{shortId(item.operation_id)}</strong>
            {item.reconciliation_status === "action_required" && (
              <AgeBadge
                iso={item.attempted_at}
                now={now}
                warnAfterHours={6}
                dangerAfterHours={24}
              />
            )}
          </span>
          <span className="ops-card-badges">
            <span className="badge badge-neutral">{item.provider}</span>
            {item.customer_refunded && (
              <span className="badge badge-neutral">
                Encerrado para o cliente
              </span>
            )}
          </span>
          <span className="ops-card-meta">
            Tentada em {dateTime.format(new Date(item.attempted_at))}
          </span>
        </>
      )}
    />
  );
}
