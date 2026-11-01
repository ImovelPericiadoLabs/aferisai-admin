import { ConfirmDialog } from "./ConfirmDialog";
import type { Pending } from "./registry-suppliers-model";
import { supplierLabel } from "./supplier-model";

export function SupplierStatusDialog({
  pending,
  block,
  busy,
  onConfirm,
  onCancel,
}: {
  pending: Pending;
  block: string | null;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      open={pending !== null}
      tone={pending?.action === "suspend" ? "danger" : "primary"}
      title={
        pending?.action === "activate"
          ? "Ativar esta conta?"
          : "Suspender esta conta?"
      }
      description={
        pending?.action === "activate"
          ? (block ??
            "A conta passa a ser a usada pelos pedidos registrais deste fornecedor. A ativação confere a integridade do cofre, mas não valida o login no fornecedor.")
          : "Novas reservas de compra deste fornecedor ficam bloqueadas. Pedidos já ligados a esta conta exigem conciliação."
      }
      details={
        pending
          ? [
              { label: "Conta", value: pending.account.label },
              {
                label: "Fornecedor",
                value: supplierLabel(pending.account.provider),
              },
              {
                label: "Versão lida",
                value: String(pending.account.version),
              },
            ]
          : []
      }
      reason={{
        label: "Motivo (fica na trilha de auditoria)",
        min: 10,
        max: 500,
      }}
      confirmDisabled={block !== null}
      confirmLabel={
        pending?.action === "activate" ? "Ativar conta" : "Suspender conta"
      }
      busy={busy}
      onConfirm={(reason) => onConfirm(reason)}
      onCancel={() => onCancel()}
    />
  );
}
