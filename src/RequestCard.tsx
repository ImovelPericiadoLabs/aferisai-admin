import { AgeBadge } from "./OpsParts";
import {
  documentLabels,
  paymentLabel,
  paymentTone,
  workLabel,
  workProgressLabel,
  workTone,
  type RequestRow,
} from "./requests-model";
import { RequestBadge as Badge } from "./RequestBadge";
import { shortId } from "./request-directory-model";

export function RequestCard({ item, now }: { item: RequestRow; now: number }) {
  return (
    <>
      <span className="ops-card-top">
        <strong>{shortId(item.request_id)}</strong>
        <AgeBadge iso={item.created_at} now={now} />
      </span>
      <span className="ops-card-badges">
        <Badge tone={paymentTone(item)}>{paymentLabel(item)}</Badge>
        <Badge tone={workTone(item)}>{workLabel(item)}</Badge>
      </span>
      <span className="ops-card-meta">
        {item.page_count} {item.page_count === 1 ? "página" : "páginas"} ·{" "}
        {documentLabels[item.document_state]}
      </span>
      {workProgressLabel(item) && (
        <span className="ops-card-meta">{workProgressLabel(item)}</span>
      )}
    </>
  );
}
