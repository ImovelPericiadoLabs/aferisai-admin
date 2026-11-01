import { promotionKindLabel } from "./display-labels";
import type { PromotionAsset } from "./api";
import { dateShort } from "./promotions-format";
import {
  promotionState,
  promotionStateLabel,
  usageOf,
} from "./promotion-model";
import { promotionTone } from "./status-tones";

export function PromotionsList({
  items,
  visible,
  loading,
  loadFailed,
  filtering,
  now,
  selectedId,
  viewing,
  orgName,
  ruleName,
  onOpen,
  onNew,
  onClearFilter,
}: {
  items: PromotionAsset[];
  visible: PromotionAsset[];
  loading: boolean;
  loadFailed: boolean;
  filtering: boolean;
  now: number;
  selectedId: string | null;
  viewing: boolean;
  orgName: (id: string) => string;
  ruleName: (id: string) => string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onClearFilter: () => void;
}) {
  return (
    <>
      {loading && items.length === 0 ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          {Array.from({ length: 5 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : visible.length === 0 && !loadFailed ? (
        <div className="empty-state" role="status">
          <strong>
            {filtering
              ? "Nenhuma promoção neste estado"
              : "Nenhuma promoção criada"}
          </strong>
          <span>
            {filtering
              ? "Escolha outro estado para ver as demais."
              : "Crie a primeira promoção para gerar um cupom ou link para um parceiro."}
          </span>
          {filtering ? (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => onClearFilter()}
            >
              Limpar filtro
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={onNew}
            >
              Nova promoção
            </button>
          )}
        </div>
      ) : (
        visible.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Promoções">
              <thead>
                <tr>
                  <th scope="col">Promoção</th>
                  <th scope="col">Organização</th>
                  <th scope="col">Validade</th>
                  <th scope="col">Uso</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((asset) => {
                  const state = promotionState(asset, now);
                  const usage = usageOf(asset);
                  return (
                    <tr
                      key={asset.id}
                      data-clickable
                      className={
                        asset.id === selectedId && viewing
                          ? "selected"
                          : undefined
                      }
                      onClick={() => onOpen(asset.id)}
                    >
                      <td data-label="Promoção">
                        <button
                          className="rules-cell-button"
                          data-row-id={asset.id}
                          type="button"
                          aria-haspopup="dialog"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpen(asset.id);
                          }}
                        >
                          <strong>{asset.public_label || "Sem rótulo"}</strong>
                          <small>{promotionKindLabel(asset.kind)}</small>
                        </button>
                      </td>
                      <td data-label="Organização">
                        <strong className="rules-cell-main">
                          {orgName(asset.organization_id)}
                        </strong>
                        <small className="rules-cell-sub">
                          {ruleName(asset.policy_version_id)}
                        </small>
                      </td>
                      <td data-label="Validade">
                        <span className="rules-cell-main">
                          {dateShort.format(new Date(asset.valid_from))} –{" "}
                          {dateShort.format(new Date(asset.valid_until))}
                        </span>
                      </td>
                      <td data-label="Uso">
                        <span className="promo-usage">
                          <span className="rules-cell-main">{usage.text}</span>
                          {usage.fraction !== null && (
                            <span
                              className="promo-usage-bar"
                              data-full={usage.fraction >= 1}
                              aria-hidden="true"
                            >
                              <span
                                style={{ width: `${usage.fraction * 100}%` }}
                              />
                            </span>
                          )}
                        </span>
                      </td>
                      <td data-label="Estado">
                        <span className={`badge ${promotionTone(state)}`}>
                          {promotionStateLabel[state]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
