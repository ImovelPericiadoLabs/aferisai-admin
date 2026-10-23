import { useState } from "react";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";
import { IntegrationIcon } from "./IntegrationIcon";
import {
  filterPermissionGroups,
  groupPermissions,
  permissionAction,
} from "./integration-insights-model";
import { PermissionIcon } from "./PermissionIcon";

const FILTER_FROM = 6;

const titleOf = (code: string, description?: string) => {
  const label = applicationPermissionLabel(code);
  return label === "Permissão não identificada" ? description || code : label;
};

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
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "granted" | "missing">("all");
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
  const descriptions = new Map(permissions.map((p) => [p.code, p.description]));
  const groups = filterPermissionGroups(
    groupPermissions(permissions, granted),
    query,
    mode,
    (code) => titleOf(code, descriptions.get(code)),
  );
  const modes = [
    { value: "all", label: "Todas", n: total },
    { value: "granted", label: "Concedidas", n: count },
    { value: "missing", label: "Não concedidas", n: total - count },
  ] as const;

  return (
    <div className="acc">
      <div className="acc-summary">
        <div className="acc-summary-text">
          <strong>
            {count} de {total} concedidas
          </strong>
          <small>
            {canChange
              ? "Use o interruptor; toda mudança pede confirmação."
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
      {total > FILTER_FROM && (
        <div className="acc-filter">
          <input
            className="input"
            type="search"
            aria-label="Buscar permissão"
            placeholder="Buscar permissão"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="seg" role="group" aria-label="Filtrar permissões">
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                className="seg-item"
                aria-pressed={mode === item.value}
                onClick={() => setMode(item.value)}
              >
                {item.label}
                <span className="seg-count">{item.n}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {groups.length === 0 && (
        <div className="empty-state" role="status">
          <strong>Nenhuma permissão neste filtro</strong>
        </div>
      )}
      {groups.map((group) => (
        <section key={group.key} className="acc-group" aria-label={group.label}>
          <h4>
            {group.label}
            <span>
              {group.grantedCount}/{group.items.length}
            </span>
          </h4>
          <div className="acc-grid">
            {group.items.map((item) => {
              const title = titleOf(item.code, item.description);
              const description = applicationPermissionDescription(
                item.code,
                item.description,
              );
              return (
                <div
                  key={item.code}
                  className="acc-tile"
                  data-granted={item.granted}
                  data-action={permissionAction(item.code)}
                  title={description}
                >
                  <span className="acc-icon">
                    <PermissionIcon code={item.code} />
                    <span className="acc-badge" aria-hidden="true">
                      <IntegrationIcon name="check" size={8} />
                    </span>
                  </span>
                  <span className="acc-text">
                    <strong title={item.code}>{title}</strong>
                    <span className="sr-only">{description}</span>
                  </span>
                  {canChange ? (
                    <button
                      type="button"
                      role="switch"
                      className="acc-switch"
                      aria-checked={item.granted}
                      aria-label={`${title}: ${item.granted ? "revogar" : "conceder"}`}
                      disabled={busy}
                      onClick={() => onRequest(item.code, item.granted)}
                    />
                  ) : (
                    <span
                      className={`badge ${item.granted ? "badge-success" : "badge-neutral"}`}
                    >
                      {item.granted ? "Concedida" : "Não"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
