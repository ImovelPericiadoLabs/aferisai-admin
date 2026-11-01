import { sourceLabel, registryStatusLabel } from "./display-labels";
import { AgeBadge } from "./OpsParts";
import type { OpsColumn } from "./OpsTable";
import {
  productLabel,
  registryBadge,
  type RegistryRow,
} from "./registry-requests-model";
import { dateTime, shortId } from "./request-directory-model";

/** Table columns for the registry request directory. */
export function registryColumns(now: number): OpsColumn<RegistryRow>[] {
  return [
    {
      id: "id",
      label: "Pedido",
      locked: true,
      render: (item) => (
        <span className="ops-id">
          <strong>{shortId(item.id)}</strong>
          <small>{dateTime.format(new Date(item.created_at))}</small>
        </span>
      ),
      text: (item) => item.id,
    },
    {
      id: "source",
      label: "Fonte",
      render: (item) => sourceLabel(item.source),
      text: (item) => sourceLabel(item.source),
    },
    {
      id: "product",
      label: "Produto",
      hideBelow: "tablet",
      render: (item) => productLabel(item.product),
      text: (item) => productLabel(item.product),
    },
    {
      id: "items",
      label: "Itens",
      hideBelow: "tablet",
      render: (item) => item.item_count,
      text: (item) => String(item.item_count),
    },
    {
      id: "status",
      label: "Estado",
      render: (item) => (
        <span className={`badge badge-${registryBadge(item)}`}>
          {registryStatusLabel(item.status)}
        </span>
      ),
      text: (item) => registryStatusLabel(item.status),
    },
    {
      id: "age",
      label: "Idade",
      align: "end",
      render: (item) => (
        <AgeBadge
          iso={item.created_at}
          now={now}
          warnAfterHours={12}
          dangerAfterHours={48}
        />
      ),
      text: (item) => item.created_at,
    },
  ];
}
