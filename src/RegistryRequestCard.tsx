import { registryStatusLabel, sourceLabel } from "./display-labels";
import { AgeBadge } from "./OpsParts";
import {
  productLabel,
  registryBadge,
  type RegistryRow,
} from "./registry-requests-model";
import { shortId } from "./request-directory-model";

export function RegistryRequestCard({
  item,
  now,
}: {
  item: RegistryRow;
  now: number;
}) {
  return (
    <>
      <span className="ops-card-top">
        <strong>{shortId(item.id)}</strong>
        <AgeBadge
          iso={item.created_at}
          now={now}
          warnAfterHours={12}
          dangerAfterHours={48}
        />
      </span>
      <span className="ops-card-badges">
        <span className={`badge badge-${registryBadge(item)}`}>
          {registryStatusLabel(item.status)}
        </span>
      </span>
      <span className="ops-card-meta">
        {sourceLabel(item.source)} · {productLabel(item.product)} ·{" "}
        {item.item_count} {item.item_count === 1 ? "item" : "itens"}
      </span>
    </>
  );
}
