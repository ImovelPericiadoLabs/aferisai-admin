import type { RefObject } from "react";
import { OpsTimeline, RecordDrawer } from "./OpsParts";
import {
  admissionLabel,
  documentLabels,
  paymentLabel,
  paymentTone,
  requestTimeline,
  workLabel,
  workProgressLabel,
  workTone,
  type RequestRow,
} from "./requests-model";
import { RequestBadge as Badge } from "./RequestBadge";
import { dateTime, shortId } from "./request-directory-model";

export function RequestRecordDrawer({
  selected,
  readOnly,
  trigger,
  onClose,
  openSource,
  openReview,
}: {
  selected: RequestRow | null;
  readOnly: boolean;
  trigger: RefObject<HTMLElement | null>;
  onClose: () => void;
  openSource: (requestId: string) => void;
  openReview: (workId: string) => void;
}) {
  return (
    <RecordDrawer
      open={selected !== null}
      title={selected ? `Pedido ${shortId(selected.request_id)}` : ""}
      subtitle={
        selected ? dateTime.format(new Date(selected.created_at)) : undefined
      }
      badges={
        selected && (
          <>
            <Badge tone={paymentTone(selected)}>{paymentLabel(selected)}</Badge>
            <Badge tone={workTone(selected)}>{workLabel(selected)}</Badge>
          </>
        )
      }
      onClose={onClose}
      returnFocus={() => trigger.current}
    >
      {selected && (
        <>
          <section className="detail-panel-section">
            <h3 className="detail-panel-section-title">Linha do tempo</h3>
            <OpsTimeline
              steps={requestTimeline(
                selected,
                dateTime.format(new Date(selected.created_at)),
              )}
            />
            <p className="ops-missing">
              A data de cada etapa ainda não vem do backend; só a criação.
            </p>
          </section>
          <section className="detail-panel-section">
            <h3 className="detail-panel-section-title">Resumo</h3>
            <dl className="ops-facts">
              <div>
                <dt>Código completo</dt>
                <dd>
                  <code>{selected.request_id}</code>
                </dd>
              </div>
              <div>
                <dt>Páginas</dt>
                <dd>{selected.page_count}</dd>
              </div>
              <div>
                <dt>Original</dt>
                <dd>{documentLabels[selected.document_state]}</dd>
              </div>
              <div>
                <dt>Arquivo</dt>
                <dd>{admissionLabel(selected)}</dd>
              </div>
              {workProgressLabel(selected) && (
                <div>
                  <dt>Andamento técnico</dt>
                  <dd>{workProgressLabel(selected)}</dd>
                </div>
              )}
            </dl>
          </section>
          {!readOnly && (
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">Ações</h3>
              <div className="ops-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={() => openSource(selected.request_id)}
                >
                  Conferir fonte
                </button>
                {selected.work_id && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-md"
                    onClick={() => openReview(selected.work_id!)}
                  >
                    Conferir análise
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </RecordDrawer>
  );
}
