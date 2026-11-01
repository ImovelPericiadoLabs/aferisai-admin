import { teamRoleLabel } from "./display-labels";
import { formatPersonDate, type Person } from "./people-model";
import { initials } from "./people-initials";
import { StatusBadge } from "./PeopleStatusBadge";

export function PeopleTable({
  title,
  visible,
  showRole,
  selectedId,
  onOpen,
}: {
  title: string;
  visible: Person[];
  showRole: boolean;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table people-table" aria-label={title}>
        <thead>
          <tr>
            <th scope="col">Conta</th>
            {showRole && <th scope="col">Papel</th>}
            <th scope="col">Estado</th>
            <th scope="col">Criada em</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((person) => (
            <tr
              key={person.id}
              data-clickable
              className={person.id === selectedId ? "selected" : undefined}
              onClick={() => onOpen(person.id)}
            >
              <td data-label="Conta">
                <button
                  className="people-name"
                  data-row-id={person.id}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(person.id);
                  }}
                >
                  <span className="people-avatar" aria-hidden="true">
                    {initials(person.email)}
                  </span>
                  <span>{person.email}</span>
                </button>
              </td>
              {showRole && (
                <td data-label="Papel">
                  <span className="badge badge-info">
                    {teamRoleLabel(person.role)}
                  </span>
                </td>
              )}
              <td data-label="Estado">
                <StatusBadge status={person.status} />
              </td>
              <td data-label="Criada em" className="people-date">
                {formatPersonDate(person.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
