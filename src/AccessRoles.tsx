import {
  ROLES,
  CAPABILITIES,
  capabilitiesFor,
  groupByArea,
  type Role,
} from "./access-matrix";
import { teamRoleLabel } from "./display-labels";

export function MyAccess({ role }: { role: Role }) {
  const groups = groupByArea(capabilitiesFor(role));
  return (
    <div className="access-mine">
      <div className="card card-body">
        <p className="kpi-label">Seu papel</p>
        <p className="access-role">{teamRoleLabel(role)}</p>
        <p className="form-hint">
          A interface só esconde o que você não pode usar. Quem decide a cada
          ação é o servidor.
        </p>
      </div>
      <div className="card card-body">
        <h2 className="access-heading">O que o seu papel permite</h2>
        {groups.map((group) => (
          <section key={group.area} className="access-area-block">
            <h3 className="detail-panel-section-title">{group.area}</h3>
            <ul className="access-list">
              {group.items.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function RoleMatrix({ role }: { role: Role }) {
  const groups = groupByArea(CAPABILITIES);
  return (
    <>
      <div className="data-table-wrap">
        <table className="data-table access-matrix" aria-label="Papéis">
          <thead>
            <tr>
              <th scope="col">Capacidade</th>
              {ROLES.map((item) => (
                <th
                  key={item}
                  scope="col"
                  className={item === role ? "access-current" : undefined}
                >
                  {teamRoleLabel(item)}
                  {item === role && <span className="access-you"> (você)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <RoleGroup key={group.area} group={group} role={role} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="form-hint access-note">
        Referência fixa. O papel Financeiro é separado da hierarquia: um
        administrador não assina no lugar do financeiro. A fonte dinâmica
        depende de um endpoint de papéis no backend.
      </p>
    </>
  );
}

function RoleGroup({
  group,
  role,
}: {
  group: { area: string; items: (typeof CAPABILITIES)[number][] };
  role: Role;
}) {
  return (
    <>
      <tr className="access-area-row">
        <th scope="rowgroup" colSpan={ROLES.length + 1}>
          {group.area}
        </th>
      </tr>
      {group.items.map((item) => (
        <tr key={item.id}>
          <th scope="row">{item.label}</th>
          {ROLES.map((column) => {
            const allowed = item.roles.includes(column);
            return (
              <td
                key={column}
                className={column === role ? "access-current" : undefined}
              >
                <span
                  className={allowed ? "access-yes" : "access-no"}
                  aria-label={allowed ? "Permitido" : "Não permitido"}
                >
                  {allowed ? "✓" : "—"}
                </span>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
