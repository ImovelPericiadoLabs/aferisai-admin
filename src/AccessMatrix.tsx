import { groupPermissions } from "./integration-insights-model";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";
import { PermissionIcon } from "./PermissionIcon";

export function AccessMatrix({
  permissions,
  granted,
  canChange,
  busy,
  onRequest,
}: {
  permissions: { code: string; description: string }[];
  granted: string[];
  canChange: boolean;
  busy: boolean;
  onRequest: (code: string, granted: boolean) => void;
}) {
  const groups = groupPermissions(permissions, granted);
  const total = permissions.length;
  const count = permissions.filter((item) =>
    granted.includes(item.code),
  ).length;
  if (total === 0)
    return (
      <div className="empty-state" role="status">
        <strong>Nenhuma permissão disponível</strong>
        <span>O catálogo desta parceria ainda não tem ações.</span>
      </div>
    );
  return (
    <div className="acc">
      <div className="acc-summary card">
        <div>
          <strong>
            {count} de {total} permissões concedidas
          </strong>
          <small>
            {canChange
              ? "Use o interruptor para conceder ou revogar. Toda mudança pede confirmação."
              : "Somente leitura: a equipe da Aferis gerencia estes acessos."}
          </small>
        </div>
        <div
          className="acc-meter"
          role="img"
          aria-label={`${count} de ${total} concedidas`}
        >
          <span style={{ width: `${(count / total) * 100}%` }} />
        </div>
      </div>
      {groups.map((group) => (
        <section key={group.key} className="acc-group" aria-label={group.label}>
          <h4>
            {group.label}
            <span>
              {group.grantedCount}/{group.items.length}
            </span>
          </h4>
          <div className="acc-grid">
            {group.items.map((item) => (
              <div
                key={item.code}
                className="acc-tile"
                data-granted={item.granted}
              >
                <PermissionIcon code={item.code} />
                <span className="acc-text">
                  <strong title={item.code}>
                    {applicationPermissionLabel(item.code)}
                  </strong>
                  <small>
                    {applicationPermissionDescription(
                      item.code,
                      item.description,
                    )}
                  </small>
                </span>
                {canChange ? (
                  <button
                    type="button"
                    role="switch"
                    className="acc-switch"
                    aria-checked={item.granted}
                    aria-label={`${applicationPermissionLabel(item.code)}: ${item.granted ? "revogar" : "conceder"}`}
                    disabled={busy}
                    onClick={() => onRequest(item.code, item.granted)}
                  />
                ) : (
                  <span
                    className={`badge ${item.granted ? "badge-success" : "badge-neutral"}`}
                  >
                    {item.granted ? "Concedida" : "Não concedida"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
