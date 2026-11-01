import { AccessMatrix } from "./AccessMatrix";
import { RedirectUriManagement } from "./RedirectUriManagement";
import type { Application, Permission } from "./application-workspace-model";

export function ApplicationAccessTab({
  application,
  permissions,
  canManage,
  channel,
  editable,
  permissionBusy,
  csrfToken,
  onUnauthorized,
  onRequestPermission,
}: {
  application: Application;
  permissions: Permission[];
  canManage: boolean;
  channel: "team" | "partner";
  editable: boolean;
  permissionBusy: boolean;
  csrfToken: string;
  onUnauthorized: () => void;
  onRequestPermission: (code: string, granted: boolean) => void;
}) {
  return (
    <div className="appws-access">
      <section aria-labelledby="appws-permissions-title">
        <h3 className="appws-section-title" id="appws-permissions-title">
          Permissões da aplicação
        </h3>
        <AccessMatrix
          permissions={permissions}
          granted={application.permissions}
          canChange={canManage && channel === "team" && editable}
          busy={permissionBusy}
          readOnlyHint={
            channel === "partner"
              ? "Somente leitura: a equipe da Aferis gerencia estes acessos."
              : "Somente leitura: seu perfil não pode alterar estes acessos, ou a aplicação está suspensa."
          }
          onRequest={onRequestPermission}
        />
      </section>
      {canManage && channel === "team" && (
        <section aria-labelledby="appws-oauth-title">
          <h3 className="appws-section-title" id="appws-oauth-title">
            Autorização OAuth
          </h3>
          <RedirectUriManagement
            applicationId={application.id}
            csrfToken={csrfToken}
            canEdit={editable}
            onUnauthorized={onUnauthorized}
          />
        </section>
      )}
    </div>
  );
}
