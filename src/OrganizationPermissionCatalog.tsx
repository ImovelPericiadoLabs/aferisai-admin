import type { OrganizationDetail as Detail } from "./api";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";
import { PermissionRegistration } from "./PermissionRegistration";
import type { ToastKind } from "./useToast";
import type { OrganizationPermissionsState } from "./useOrganizationPermissions";

export function OrganizationPermissionCatalog({
  organizationId,
  csrfToken,
  permissions,
  canManage,
  isAdmin,
  state,
  onRegistered,
  onUnauthorized,
  onToast,
}: {
  organizationId: string;
  csrfToken: string;
  permissions: Detail["permissions"];
  canManage: boolean;
  isAdmin: boolean;
  state: OrganizationPermissionsState;
  onRegistered: () => Promise<void>;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const {
    permissionEditing,
    setPermissionEditing,
    permissionDescription,
    setPermissionDescription,
    permissionBusy,
    savePermissionDescription,
  } = state;
  return (
    <section className="card partner-catalog" aria-labelledby="catalog-title">
      <div className="card-header">
        <h2 className="card-title" id="catalog-title">
          Catálogo de ações
        </h2>
        <div className="people-header-actions">
          <span className="badge badge-neutral">{permissions.length}</span>
          {canManage && (
            <PermissionRegistration
              organizationId={organizationId}
              csrfToken={csrfToken}
              registered={permissions.map((p) => p.code)}
              onRegistered={onRegistered}
              onUnauthorized={onUnauthorized}
              onToast={onToast}
            />
          )}
        </div>
      </div>
      <div className="card-body">
        <p className="form-hint">
          Permissões que esta organização pode conceder às suas aplicações.
        </p>
        {permissions.length === 0 ? (
          <div className="empty-state" role="status">
            <strong>Nenhuma ação no catálogo</strong>
          </div>
        ) : (
          <ul className="catalog-list">
            {permissions.map((permission) => (
              <li key={permission.code}>
                <strong title={permission.code}>
                  {applicationPermissionLabel(permission.code)}
                </strong>
                {permissionEditing === permission.code ? (
                  <form
                    className="form-stack"
                    onSubmit={savePermissionDescription}
                  >
                    <div className="form-field">
                      <label
                        className="form-field-label"
                        htmlFor="permission-description"
                      >
                        Descrição da ação
                      </label>
                      <input
                        id="permission-description"
                        className="input"
                        required
                        maxLength={255}
                        value={permissionDescription}
                        onChange={(event) =>
                          setPermissionDescription(event.target.value)
                        }
                      />
                    </div>
                    <div className="partner-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={
                          permissionBusy !== null ||
                          !permissionDescription.trim()
                        }
                      >
                        {permissionBusy ? "Salvando…" : "Salvar descrição"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={permissionBusy !== null}
                        onClick={() => setPermissionEditing(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span>
                      {permission.description?.trim() ||
                        applicationPermissionDescription(permission.code)}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={permissionBusy !== null}
                        onClick={() => {
                          setPermissionEditing(permission.code);
                          setPermissionDescription(permission.description);
                        }}
                      >
                        Editar descrição
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
