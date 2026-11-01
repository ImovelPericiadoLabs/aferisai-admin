import type { RefObject } from "react";
import { registryStatusLabel, sourceLabel } from "./display-labels";
import { OpsTimeline, RecordDrawer } from "./OpsParts";
import {
  productLabel,
  registryBadge,
  registryTimeline,
  type RegistryRow,
} from "./registry-requests-model";
import { dateTime, shortId } from "./request-directory-model";

export function RegistryRecordDrawer({
  selected,
  trigger,
  onClose,
}: {
  selected: RegistryRow | null;
  trigger: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  return (
    <RecordDrawer
      open={selected !== null}
      title={selected ? `Pedido ${shortId(selected.id)}` : ""}
      subtitle={
        selected ? dateTime.format(new Date(selected.created_at)) : undefined
      }
      badges={
        selected && (
          <span className={`badge badge-${registryBadge(selected)}`}>
            {registryStatusLabel(selected.status)}
          </span>
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
              steps={registryTimeline(
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
                  <code>{selected.id}</code>
                </dd>
              </div>
              <div>
                <dt>Fonte</dt>
                <dd>{sourceLabel(selected.source)}</dd>
              </div>
              <div>
                <dt>Produto</dt>
                <dd>{productLabel(selected.product)}</dd>
              </div>
              <div>
                <dt>Itens</dt>
                <dd>{selected.item_count}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </RecordDrawer>
  );
}
