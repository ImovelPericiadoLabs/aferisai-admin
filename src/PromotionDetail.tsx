import type { PromotionAsset } from "./api";
import { promotionKindLabel } from "./display-labels";
import { dateTime } from "./promotions-format";
import {
  promotionState,
  promotionStateLabel,
  usageOf,
} from "./promotion-model";
import { promotionTone } from "./status-tones";

export function PromotionDetail({
  selected,
  now,
  formError,
  busy,
  orgName,
  ruleName,
  onClose,
  onAskSuspend,
}: {
  selected: PromotionAsset;
  now: number;
  formError: string;
  busy: boolean;
  orgName: (id: string) => string;
  ruleName: (id: string) => string;
  onClose: () => void;
  onAskSuspend: () => void;
}) {
  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="promo-panel-title">
            {selected.public_label || "Promoção sem rótulo"}
          </h2>
          <div className="rules-panel-badges">
            <span
              className={`badge ${promotionTone(promotionState(selected, now))}`}
            >
              {promotionStateLabel[promotionState(selected, now)]}
            </span>
            <span className="rules-panel-sub">
              {promotionKindLabel(selected.kind)}
            </span>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-label="Fechar"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="detail-panel-body">
        {formError && (
          <div className="alert alert-danger form-alert" role="alert">
            {formError}
          </div>
        )}
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Quem recebe</h3>
          <dl className="detail-panel-field">
            <dt>Organização</dt>
            <dd>{orgName(selected.organization_id)}</dd>
            <dt>Regra</dt>
            <dd>{ruleName(selected.policy_version_id)}</dd>
          </dl>
        </section>
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Validade e uso</h3>
          <dl className="detail-panel-field">
            <dt>Início</dt>
            <dd>{dateTime.format(new Date(selected.valid_from))}</dd>
            <dt>Fim</dt>
            <dd>{dateTime.format(new Date(selected.valid_until))}</dd>
            <dt>Usos</dt>
            <dd>{usageOf(selected).text}</dd>
            <dt>Criada em</dt>
            <dd>{dateTime.format(new Date(selected.created_at))}</dd>
            {selected.suspended_at && (
              <>
                <dt>Suspensa em</dt>
                <dd>{dateTime.format(new Date(selected.suspended_at))}</dd>
              </>
            )}
          </dl>
        </section>
        <p className="form-hint">
          O código não é guardado em texto simples e não pode ser consultado de
          novo.
        </p>
      </div>
      {selected.status !== "suspended" && (
        <div className="detail-panel-footer">
          <button
            className="btn btn-danger btn-md"
            type="button"
            disabled={busy}
            onClick={() => onAskSuspend()}
          >
            Suspender promoção
          </button>
        </div>
      )}
    </>
  );
}
