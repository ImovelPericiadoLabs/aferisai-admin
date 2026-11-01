import { Checkbox } from "./controls";
import { PermissionIcon } from "./PermissionIcon";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";
import type { Decision, Permission } from "./application-directory-model";

export function ApplicationBulkChangeForm({
  permissions,
  decisions,
  statusEnabled,
  nextStatus,
  onStatusEnabled,
  onNextStatus,
  onDecision,
}: {
  permissions: Permission[];
  decisions: Record<string, Decision>;
  statusEnabled: boolean;
  nextStatus: "active" | "suspended";
  onStatusEnabled: (checked: boolean) => void;
  onNextStatus: (status: "active" | "suspended") => void;
  onDecision: (code: string, decision: Decision) => void;
}) {
  return (
    <section className="card appdir-block">
      <h4>O que alterar</h4>
      <div className="appdir-status-field">
        <Checkbox
          id="appdir-status-enabled"
          label="Alterar estado"
          checked={statusEnabled}
          onChange={(checked) => {
            onStatusEnabled(checked);
          }}
        />
        <select
          className="input"
          aria-label="Novo estado"
          disabled={!statusEnabled}
          value={nextStatus}
          onChange={(event) => {
            onNextStatus(event.target.value as "active" | "suspended");
          }}
        >
          <option value="active">Ativa</option>
          <option value="suspended">Suspensa</option>
        </select>
      </div>
      <fieldset className="appdir-permissions">
        <legend className="form-section-title">Permissões</legend>
        <p className="form-hint">
          Defina separadamente o que conceder ou revogar. “Não alterar” mantém
          cada aplicação como está.
        </p>
        {permissions.map((permission) => (
          <div className="appdir-permission-row" key={permission.code}>
            <PermissionIcon code={permission.code} />
            <span>
              <strong>{applicationPermissionLabel(permission.code)}</strong>
              <small>
                {applicationPermissionDescription(
                  permission.code,
                  permission.description,
                )}
              </small>
            </span>
            <select
              className="input"
              aria-label={`${applicationPermissionLabel(permission.code)}: ação`}
              value={decisions[permission.code] ?? "none"}
              onChange={(event) =>
                onDecision(permission.code, event.target.value as Decision)
              }
            >
              <option value="none">Não alterar</option>
              <option value="grant">Conceder</option>
              <option value="revoke">Revogar</option>
            </select>
          </div>
        ))}
        {decisions["application:read"] === "revoke" && (
          <div className="alert alert-warning" role="note">
            Revogar “Consultar integração” impede que a credencial da aplicação
            consulte seus próprios dados.
          </div>
        )}
      </fieldset>
    </section>
  );
}
