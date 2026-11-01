import type { WebhookEndpoint } from "./api";
import { ConfirmDialog } from "./ConfirmDialog";

const auditReason = {
  label: "Motivo (fica na trilha de auditoria)",
  min: 3,
  max: 500,
};

export function WebhookConfirmDialogs({
  endpoint,
  confirmSuspend,
  confirmRemove,
  busy,
  onSuspend,
  onRemove,
  onCancelSuspend,
  onCancelRemove,
}: {
  endpoint: WebhookEndpoint | null;
  confirmSuspend: boolean;
  confirmRemove: boolean;
  busy: boolean;
  onSuspend: (reason: string) => void;
  onRemove: (reason: string) => void;
  onCancelSuspend: () => void;
  onCancelRemove: () => void;
}) {
  return (
    <>
      <ConfirmDialog
        open={confirmSuspend && endpoint?.status === "active"}
        title="Suspender este destino?"
        description="Eventos futuros não serão enviados até você reativar o webhook."
        details={endpoint ? [{ label: "Destino", value: endpoint.url }] : []}
        confirmLabel="Confirmar suspensão"
        busy={busy}
        reason={auditReason}
        onConfirm={onSuspend}
        onCancel={onCancelSuspend}
      />
      <ConfirmDialog
        open={confirmRemove}
        tone="danger"
        title="Remover este destino?"
        description="Remover interrompe as entregas futuras. A chave atual será descartada."
        details={endpoint ? [{ label: "Destino", value: endpoint.url }] : []}
        confirmLabel="Remover destino"
        busy={busy}
        reason={auditReason}
        onConfirm={onRemove}
        onCancel={onCancelRemove}
      />
    </>
  );
}
