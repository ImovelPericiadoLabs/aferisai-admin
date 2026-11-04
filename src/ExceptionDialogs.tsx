import type { PaymentExceptionCase } from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { REASON_PRESETS } from "./reason-presets";
import {
  money,
  outcomeLabel,
  type Asking,
  type ExecuteAction,
} from "./exception-panel-model";

export function ExceptionDialogs({
  item,
  asking,
  setAsking,
  busy,
  resolution,
  target,
  newMember,
  setNewMember,
  person,
  finish,
  onPropose,
  onConfirm,
  onReassign,
  onExecute,
}: {
  item: PaymentExceptionCase;
  asking: Asking;
  setAsking: (value: Asking) => void;
  busy: boolean;
  resolution: "correct" | "refund";
  target: "manager" | "financial";
  newMember: string;
  setNewMember: (value: string) => void;
  person: (id: string | null) => string;
  finish: (run: () => Promise<boolean>) => Promise<void>;
  onPropose: (
    resolution: "correct" | "refund",
    reason: string,
  ) => Promise<boolean>;
  onConfirm: (reason: string) => Promise<boolean>;
  onReassign: (
    target: "manager" | "financial",
    memberId: string,
    reason: string,
  ) => Promise<boolean>;
  onExecute: (action: ExecuteAction) => void;
}) {
  return (
    <>
      <ConfirmDialog
        open={asking === "propose"}
        title="Registrar proposta?"
        description="A proposta exige uma decisão financeira registrada separadamente. O administrador pode assumir as duas etapas."
        details={[
          { label: "Encaminhamento", value: outcomeLabel(resolution) },
          { label: "Valor", value: money(item.amount_cents) },
        ]}
        reason={{
          label: "Por que esta proposta?",
          min: 10,
          max: 500,
          presets: REASON_PRESETS[`propose-${resolution}`],
        }}
        confirmLabel="Registrar proposta"
        busy={busy}
        onConfirm={(reason) => void finish(() => onPropose(resolution, reason))}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "confirm"}
        title="Confirmar decisão financeira?"
        description="Depois da confirmação, a execução passa a ser sua responsabilidade."
        details={[
          { label: "Proposta", value: outcomeLabel(item.proposed_resolution) },
          { label: "Motivo do gestor", value: item.proposal_reason ?? "—" },
          { label: "Valor", value: money(item.amount_cents) },
        ]}
        reason={{
          label: "Por que confirmar?",
          min: 10,
          max: 500,
          presets:
            REASON_PRESETS[
              item.proposed_resolution === "refund"
                ? "confirm-refund"
                : "confirm-correct"
            ],
        }}
        confirmLabel="Confirmar decisão"
        busy={busy}
        onConfirm={(reason) => void finish(() => onConfirm(reason))}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "refund"}
        tone="danger"
        title="Iniciar estorno integral?"
        description={
          item.funding_source === "credits"
            ? "O valor integral será devolvido ao saldo de créditos do cliente, sem chamada ao Asaas."
            : "O estorno integral será solicitado ao Asaas da conta que recebeu o PIX. Uma resposta incerta exige conciliação antes de qualquer nova ação."
        }
        details={[
          { label: "Valor", value: money(item.amount_cents) },
          { label: "Trabalho", value: item.work_id },
        ]}
        confirmLabel={
          item.funding_source === "credits"
            ? "Devolver créditos"
            : "Iniciar estorno"
        }
        busy={busy}
        onConfirm={() => {
          setAsking(null);
          onExecute("refund-attempts");
        }}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "reassign"}
        title="Reatribuir o caso?"
        description="A pessoa anterior deixa de ser responsável. O motivo fica no histórico."
        details={[
          {
            label: "Função",
            value: target === "manager" ? "Gestor" : "Financeiro",
          },
          {
            label: "Atual",
            value: person(
              target === "manager"
                ? item.manager_assignee_id
                : item.financial_assignee_id,
            ),
          },
        ]}
        reason={{
          label: "Por que trocar a pessoa responsável?",
          min: 10,
          max: 500,
          presets: REASON_PRESETS.reassign,
        }}
        confirmLabel="Reatribuir"
        busy={busy}
        onConfirm={(reason) =>
          void finish(async () => {
            const done = await onReassign(target, newMember, reason);
            if (done) setNewMember("");
            return done;
          })
        }
        onCancel={() => setAsking(null)}
      />
    </>
  );
}
