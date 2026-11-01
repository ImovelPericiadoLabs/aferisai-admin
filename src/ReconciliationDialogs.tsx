import { ConfirmDialog } from "./ConfirmDialog";
import { shortId } from "./reconciliation-format";
import {
  DECISIONS,
  type Decision,
  type UncertainRow,
} from "./reconciliation-model";

export function ReconciliationDialogs({
  selected,
  decision,
  protocol,
  confirming,
  busy,
  batchRows,
  batchConfirming,
  batchBusy,
  onConfirm,
  onCancel,
  onConfirmBatch,
  onCancelBatch,
}: {
  selected: UncertainRow | null;
  decision: Decision;
  protocol: string;
  confirming: boolean;
  busy: boolean;
  batchRows: UncertainRow[];
  batchConfirming: boolean;
  batchBusy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  onConfirmBatch: (reason: string) => void;
  onCancelBatch: () => void;
}) {
  return (
    <>
      <ConfirmDialog
        open={
          confirming && selected?.reconciliation_status === "action_required"
        }
        tone={decision === "no_purchase" ? "danger" : "primary"}
        title={
          decision === "no_purchase"
            ? "Registrar que não houve compra?"
            : "Confirmar o protocolo?"
        }
        description={
          decision === "no_purchase"
            ? "A decisão é auditada e pode liberar nova tentativa automática de aquisição para este pedido ativo. Confirme no portal que não houve compra."
            : "A decisão é auditada e vincula o protocolo confirmado a este pedido ativo."
        }
        details={
          selected
            ? [
                { label: "Operação", value: shortId(selected.operation_id) },
                {
                  label: "Decisão",
                  value:
                    DECISIONS.find((d) => d.value === decision)?.label ?? "",
                },
                ...(decision === "protocol_confirmed"
                  ? [{ label: "Protocolo", value: protocol.trim() }]
                  : []),
              ]
            : []
        }
        reason={{
          label: "Justificativa (sem dados pessoais)",
          min: 20,
          max: 2000,
        }}
        confirmLabel="Registrar decisão"
        busy={busy}
        onConfirm={(reason) => onConfirm(reason)}
        onCancel={() => onCancel()}
      />

      <ConfirmDialog
        open={batchConfirming && batchRows.length > 0}
        tone="danger"
        title={`Registrar sem compra em ${batchRows.length} envios?`}
        description="Confirme que verificou cada envio selecionado no portal. Cada item será revalidado e auditado separadamente; os pedidos ainda ativos podem voltar à fila de aquisição. Falhas ficam visíveis para correção."
        details={batchRows.map((row) => ({
          label: shortId(row.item_id),
          value: `${shortId(row.operation_id)} · ${row.provider}`,
        }))}
        reason={{
          label: "Justificativa da conferência (sem dados pessoais)",
          min: 20,
          max: 2000,
        }}
        confirmLabel="Registrar lote"
        busy={batchBusy}
        onConfirm={(reason) => onConfirmBatch(reason)}
        onCancel={() => onCancelBatch()}
      />
    </>
  );
}
