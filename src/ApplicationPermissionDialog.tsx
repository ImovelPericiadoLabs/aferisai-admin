import { ConfirmDialog } from "./ConfirmDialog";
import { applicationPermissionLabel } from "./display-labels";
import type { Application } from "./application-workspace-model";

export type PermissionReview =
  | { kind: "single"; code: string; granted: boolean }
  | { kind: "all"; count: number };

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
      tone={
        permissionToReview?.kind === "single" && permissionToReview.granted
          ? "danger"
          : "primary"
      }
      title={
        permissionToReview?.kind === "all"
          ? "Conceder todas as permissões?"
          : permissionToReview?.kind === "single" && permissionToReview.granted
            ? "Revogar esta permissão?"
            : "Conceder esta permissão?"
      }
      description={
        permissionToReview?.kind === "all"
          ? "As permissões disponíveis no catálogo desta parceria serão concedidas de uma vez. As que já existem serão mantidas."
          : permissionToReview?.kind === "single" && permissionToReview.granted
            ? "As credenciais desta aplicação perdem a permissão imediatamente."
            : "As credenciais desta aplicação poderão usar a permissão após a alteração."
      }
      details={
        permissionToReview
          ? [
              { label: "Aplicação", value: application.name },
              permissionToReview.kind === "all"
                ? {
                    label: "Escopo",
                    value: `${permissionToReview.count} permissões do catálogo`,
                  }
                : {
                    label: "Permissão",
                    value: applicationPermissionLabel(permissionToReview.code),
                  },
            ]
          : []
      }
      confirmLabel={
        permissionToReview?.kind === "all"
          ? "Conceder todas"
          : permissionToReview?.kind === "single" && permissionToReview.granted
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
