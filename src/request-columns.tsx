import { AgeBadge } from "./OpsParts";
import type { OpsColumn } from "./OpsTable";
import {
  admissionLabel,
  documentLabels,
  documentTone,
  paymentLabel,
  paymentTone,
  workLabel,
  workProgressLabel,
  workTone,
  type RequestRow,
} from "./requests-model";
import { RequestBadge as Badge } from "./RequestBadge";
import { dateTime, shortId } from "./request-directory-model";

/** Table columns for the archive request directory. */
export function requestColumns(now: number): OpsColumn<RequestRow>[] {
  return [
    {
      id: "id",
      label: "Pedido",
      locked: true,
      render: (item) => (
        <span className="ops-id">
          <strong>{shortId(item.request_id)}</strong>
          <small>{dateTime.format(new Date(item.created_at))}</small>
        </span>
      ),
      text: (item) => item.request_id,
    },
    {
      id: "pages",
      label: "Páginas",
      hideBelow: "tablet",
      render: (item) => item.page_count,
      text: (item) => String(item.page_count),
    },
    {
      id: "document",
      label: "Original",
      render: (item) => (
        <Badge tone={documentTone(item)}>
          {documentLabels[item.document_state]}
        </Badge>
      ),
      text: (item) => documentLabels[item.document_state],
    },
    {
      id: "admission",
      label: "Arquivo",
      hideBelow: "tablet",
      render: (item) => admissionLabel(item),
      text: admissionLabel,
    },
    {
      id: "payment",
      label: "Pagamento",
      render: (item) => (
        <Badge tone={paymentTone(item)}>{paymentLabel(item)}</Badge>
      ),
      text: paymentLabel,
    },
    {
      id: "work",
      label: "Análise",
      render: (item) => (
        <span>
          <Badge tone={workTone(item)}>{workLabel(item)}</Badge>
          {workProgressLabel(item) && (
            <small style={{ display: "block", marginTop: 4 }}>
              {workProgressLabel(item)}
            </small>
          )}
        </span>
      ),
      text: workLabel,
    },
    {
      id: "age",
      label: "Idade",
      align: "end",
      render: (item) => <AgeBadge iso={item.created_at} now={now} />,
      text: (item) => item.created_at,
    },
  ];
}
