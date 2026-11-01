import { ConfirmDialog } from "./ConfirmDialog";
import { applicationPermissionLabel } from "./display-labels";
import type { Application } from "./application-workspace-model";

export type PermissionReview = { code: string; granted: boolean };

export function ApplicationPermissionDialog({
  application,
  permissionToReview,
  busy,
  onConfirm,
  onCancel,
}: {
  application: Application;
  permissionToReview: PermissionReview | null;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      open={permissionToReview !== null}
      tone={permissionToReview?.granted ? "danger" : "primary"}
      title={
        permissionToReview?.granted
          ? "Revogar esta permissão?"
          : "Conceder esta permissão?"
      }
      description={
        permissionToReview?.granted
          ? "As credenciais desta aplicação perdem a permissão imediatamente."
          : "As credenciais desta aplicação poderão usar a permissão após a alteração."
      }
      details={
        permissionToReview
          ? [
              { label: "Aplicação", value: application.name },
              {
                label: "Permissão",
                value: applicationPermissionLabel(permissionToReview.code),
              },
            ]
          : []
      }
      confirmLabel={
        permissionToReview?.granted
          ? "Confirmar revogação"
          : "Confirmar concessão"
      }
      busy={busy}
      reason={{
        label: "Motivo (fica na trilha de auditoria)",
        min: 3,
        max: 500,
      }}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
