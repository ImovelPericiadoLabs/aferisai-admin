import type { PaymentExceptionCase } from "./api";
import { Disclosure, RadioGroup } from "./controls";
import type { nextAction } from "./exception-model";
import type { Asking, ExecuteAction, Role } from "./exception-panel-model";

export function ExceptionNextStep({
  item,
  role,
  action,
  busy,
  resolution,
  setResolution,
  canReviseProposal,
  setAsking,
  onClaim,
  onExecute,
}: {
  item: PaymentExceptionCase;
  role: Role;
  action: ReturnType<typeof nextAction>;
  busy: boolean;
  resolution: "correct" | "refund";
  setResolution: (value: "correct" | "refund") => void;
  canReviseProposal: boolean;
  setAsking: (value: Asking) => void;
  onClaim: () => void;
  onExecute: (action: ExecuteAction) => void;
}) {
  const deliveryPending = (item.affected_items ?? []).some(
    (entry) => entry.item_status !== "confirmed",
  );
  const note = deliveryPending
    ? "Os documentos estão sendo processados pelo fornecedor. Quando todos forem entregues, você poderá confirmar a correção."
    : item.funding_source === "credits"
      ? "A devolução integral retorna ao saldo de créditos usado nesta compra e fica registrada no extrato."
      : "O estorno PIX exige confirmação e conciliação no Asaas antes de comunicar o encerramento ao titular.";

  return (
    <section className="detail-panel-section">
      <h3 className="detail-panel-section-title">Próximo passo</h3>
      {action.kind === "wait" && <p className="form-hint">{action.reason}</p>}
      {action.kind === "none" && (
        <p className="form-hint">Este caso está concluído.</p>
      )}
      {action.kind === "claim" && (
        <button
          className="btn btn-primary btn-md"
          type="button"
          disabled={busy}
          onClick={onClaim}
        >
          {role === "administrator" && item.latest_proposal_id
            ? "Assumir decisão financeira"
            : "Assumir este caso"}
        </button>
      )}
      {action.kind === "propose" && (
        <div className="exc-stack">
          <RadioGroup
            name="exc-resolution"
            legend="Encaminhamento"
            value={resolution}
            onChange={(value) => setResolution(value as "correct" | "refund")}
            options={[
              {
                value: "correct",
                label: "Corrigir entrega",
                description: "O titular recebe o que pagou.",
              },
              {
                value: "refund",
                label: "Reembolsar",
                description: "Devolver o valor pago.",
              },
            ]}
          />
          <button
            className="btn btn-primary btn-md"
            type="button"
            disabled={busy}
            onClick={() => setAsking("propose")}
          >
            Registrar proposta
          </button>
        </div>
      )}
      {canReviseProposal && action.kind !== "propose" && (
        <Disclosure title="Alterar proposta antes da confirmação">
          <div className="exc-stack">
            <RadioGroup
              name="exc-revise-resolution"
              legend="Novo encaminhamento"
              value={resolution}
              onChange={(value) => setResolution(value as "correct" | "refund")}
              options={[
                { value: "correct", label: "Corrigir entrega" },
                { value: "refund", label: "Reembolsar" },
              ]}
            />
            <button
              className="btn btn-secondary btn-md"
              type="button"
              disabled={busy}
              onClick={() => setAsking("propose")}
            >
              Registrar nova proposta
            </button>
          </div>
        </Disclosure>
      )}
      {action.kind === "confirm" && (
        <button
          className="btn btn-primary btn-md"
          type="button"
          disabled={busy}
          onClick={() => setAsking("confirm")}
        >
          Confirmar decisão financeira
        </button>
      )}
      {action.kind === "start-refund" && (
        <button
          className="btn btn-danger btn-md"
          type="button"
          disabled={busy}
          onClick={() => setAsking("refund")}
        >
          {item.funding_source === "credits"
            ? "Devolver créditos"
            : "Iniciar estorno integral"}
        </button>
      )}
      {action.kind === "reconcile-refund" && (
        <button
          className="btn btn-secondary btn-md"
          type="button"
          disabled={busy}
          onClick={() => onExecute("refund-reconciliations")}
        >
          Conciliar estorno
        </button>
      )}
      {action.kind === "verify-correction" && (
        <button
          className="btn btn-secondary btn-md"
          type="button"
          disabled={busy}
          onClick={() => onExecute("correction-verifications")}
        >
          Verificar entrega corrigida
        </button>
      )}
      {action.kind === "retry-delivery" && (
        <button
          className="btn btn-primary btn-md"
          type="button"
          disabled={busy}
          onClick={() => onExecute("delivery-retries")}
        >
          Tentar corrigir entrega
        </button>
      )}
      <div className="alert exc-note" role="note">
        {action.kind === "retry-delivery"
          ? "A tentativa recoloca os documentos ausentes na fila sem nova cobrança."
          : note}
      </div>
    </section>
  );
}
