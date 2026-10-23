import { useState } from "react";
import type { CommercialPolicy, CommercialPolicyPreview } from "./api";
import {
  describeAmount,
  money,
  scopeSummary,
  statusTone,
  validityState,
} from "./commercial-model";
import { ConfirmDialog } from "./ConfirmDialog";
import { itemLabel, sourceLabel, statusLabel } from "./display-labels";

type Props = {
  policy: CommercialPolicy;
  orgNames: Record<string, string>;
  busy: boolean;
  error: string;
  preview: CommercialPolicyPreview | null;
  onClose: () => void;
  onEdit: (policy: CommercialPolicy) => void;
  onDecide: (policy: CommercialPolicy, reason: string) => Promise<boolean>;
  onSimulate: (
    policy: CommercialPolicy,
    basePrice: string,
    count: string,
  ) => void;
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const validityLabel = {
  future: "Ainda não iniciou",
  active: "Vigente agora",
  expired: "Período encerrado",
} as const;

export function CommercialPolicyPanel({
  policy,
  orgNames,
  busy,
  error,
  preview,
  onClose,
  onEdit,
  onDecide,
  onSimulate,
}: Props) {
  const [deciding, setDeciding] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [count, setCount] = useState("1");

  const scope = scopeSummary(policy, orgNames);
  const validity = validityState(policy.valid_from, policy.valid_until);
  const action = policy.status === "draft" ? "Publicar" : "Suspender";
  const canDecide = policy.status !== "suspended";

  async function confirm() {
    if (reason.trim().length < 3) return;
    const done = await onDecide(policy, reason.trim());
    setAsking(false);
    if (done) {
      setDeciding(false);
      setReason("");
    }
  }

  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="rules-panel-title">
            {itemLabel(policy.item_code)}
          </h2>
          <div className="rules-panel-badges">
            <span className={`badge ${statusTone(policy.status)}`}>
              {statusLabel(policy.status)}
            </span>
            <span className="rules-panel-sub">{scope.primary}</span>
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
        {error && (
          <div className="alert alert-danger form-alert" role="alert">
            {error}
          </div>
        )}
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Onde vale</h3>
          <dl className="detail-panel-field">
            <dt>Escopo</dt>
            <dd>{scope.primary}</dd>
            <dt>Canal</dt>
            <dd>{sourceLabel(policy.channel)}</dd>
            <dt>Detalhe</dt>
            <dd>{scope.secondary}</dd>
          </dl>
        </section>
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">O que cobre</h3>
          <dl className="detail-panel-field">
            <dt>Item</dt>
            <dd>{itemLabel(policy.item_code)}</dd>
            <dt>Entrada da consulta</dt>
            <dd>{sourceLabel(policy.source)}</dd>
          </dl>
        </section>
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Vigência</h3>
          <dl className="detail-panel-field">
            <dt>Início</dt>
            <dd>{dateTime.format(new Date(policy.valid_from))}</dd>
            <dt>Fim</dt>
            <dd>{dateTime.format(new Date(policy.valid_until))}</dd>
            <dt>Situação</dt>
            <dd>{validityLabel[validity]}</dd>
          </dl>
        </section>
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Condições</h3>
          <dl className="detail-panel-field">
            <dt>Desconto</dt>
            <dd>
              {describeAmount(
                policy.discount_rate_bps,
                policy.discount_fixed_cents,
              )}
            </dd>
            <dt>Comissão</dt>
            <dd>
              {describeAmount(
                policy.commission_rate_bps,
                policy.commission_fixed_cents,
              )}
            </dd>
          </dl>
        </section>
        {policy.status === "published" && (
          <section className="detail-panel-section">
            <h3 className="detail-panel-section-title">Simular preço</h3>
            <div className="form-row">
              <div className="form-field">
                <label className="form-field-label" htmlFor="sim-base">
                  Preço base (R$)
                </label>
                <input
                  id="sim-base"
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={basePrice}
                  onChange={(event) => setBasePrice(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-field-label" htmlFor="sim-count">
                  Quantidade
                </label>
                <input
                  id="sim-count"
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                />
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm rules-sim-button"
              type="button"
              disabled={busy || !basePrice}
              onClick={() => onSimulate(policy, basePrice, count)}
            >
              Calcular
            </button>
            {preview && preview.policy_version_id === policy.id && (
              <dl className="detail-panel-field rules-sim-result">
                <dt>Desconto</dt>
                <dd>{money(preview.discount_cents)}</dd>
                <dt>Comissão</dt>
                <dd>{money(preview.commission_cents)}</dd>
                <dt>A pagar</dt>
                <dd>{money(preview.payable_cents)}</dd>
                {preview.ineligible_reason && (
                  <>
                    <dt>Inelegível</dt>
                    <dd>{preview.ineligible_reason}</dd>
                  </>
                )}
              </dl>
            )}
          </section>
        )}
        {deciding && (
          <section className="detail-panel-section">
            <h3 className="detail-panel-section-title">
              {policy.status === "draft"
                ? "Confirmar publicação"
                : "Confirmar suspensão"}
            </h3>
            <div className="form-field">
              <label className="form-field-label" htmlFor="decision-reason">
                {policy.status === "draft"
                  ? "Motivo da publicação"
                  : "Motivo da suspensão"}
              </label>
              <input
                id="decision-reason"
                className="input"
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <span className="form-hint">
                Mínimo de 3 caracteres. Fica registrado no histórico.
              </span>
            </div>
          </section>
        )}
      </div>
      <ConfirmDialog
        open={asking}
        tone={policy.status === "draft" ? "primary" : "danger"}
        title={
          policy.status === "draft"
            ? "Publicar esta regra?"
            : "Suspender esta regra?"
        }
        description={
          policy.status === "draft"
            ? "A versão publicada fica registrada como condição aprovada e deixa de poder ser editada."
            : "A regra deixa de ser usada em novas cotações. Versões já registradas continuam no histórico."
        }
        details={[
          { label: "Item", value: itemLabel(policy.item_code) },
          { label: "Escopo", value: scope.primary },
          { label: "Motivo", value: reason.trim() },
        ]}
        confirmLabel={policy.status === "draft" ? "Publicar" : "Suspender"}
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setAsking(false)}
      />
      <div className="detail-panel-footer">
        {deciding ? (
          <>
            <button
              className={`btn btn-md ${policy.status === "draft" ? "btn-primary" : "btn-danger"}`}
              type="button"
              disabled={busy || reason.trim().length < 3}
              onClick={() => setAsking(true)}
            >
              Confirmar
            </button>
            <button
              className="btn btn-ghost btn-md"
              type="button"
              onClick={() => {
                setDeciding(false);
                setReason("");
              }}
            >
              Voltar
            </button>
          </>
        ) : (
          <>
            {policy.status === "draft" && (
              <button
                className="btn btn-secondary btn-md"
                type="button"
                onClick={() => onEdit(policy)}
              >
                Editar rascunho
              </button>
            )}
            {canDecide && (
              <button
                className={`btn btn-md ${policy.status === "draft" ? "btn-primary" : "btn-ghost-danger"}`}
                type="button"
                onClick={() => setDeciding(true)}
              >
                {action}
              </button>
            )}
            <button
              className="btn btn-ghost btn-md"
              type="button"
              onClick={onClose}
            >
              Fechar
            </button>
          </>
        )}
      </div>
    </>
  );
}
