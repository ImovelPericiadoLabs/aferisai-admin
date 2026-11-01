import { statusLabel, type Application } from "./application-directory-model";

export function ApplicationDirectoryTable({
  visible,
  selected,
  canManage,
  canSelectMore,
  canSelectAllVisible,
  allVisibleSelected,
  onSelectVisible,
  onChangeSelection,
  onOpen,
}: {
  visible: Application[];
  selected: string[];
  canManage: boolean;
  canSelectMore: boolean;
  canSelectAllVisible: boolean;
  allVisibleSelected: boolean;
  onSelectVisible: (checked: boolean) => void;
  onChangeSelection: (id: string, checked: boolean) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table" aria-label="Aplicações">
        <thead>
          <tr>
            {canManage && (
              <th scope="col" className="appdir-check">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas as aplicações exibidas"
                  checked={allVisibleSelected}
                  disabled={!allVisibleSelected && !canSelectAllVisible}
                  onChange={(event) => onSelectVisible(event.target.checked)}
                />
              </th>
            )}
            <th scope="col">Aplicação</th>
            <th scope="col">Permissões</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => (
            <tr key={item.id}>
              {canManage && (
                <td className="appdir-check">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${item.name}`}
                    checked={selected.includes(item.id)}
                    disabled={!selected.includes(item.id) && !canSelectMore}
                    onChange={(event) =>
                      onChangeSelection(item.id, event.target.checked)
                    }
                  />
                </td>
              )}
              <td data-label="Aplicação">
                <button
                  type="button"
                  className="rules-cell-button"
                  onClick={() => onOpen(item.id)}
                >
                  <strong>{item.name}</strong>
                </button>
              </td>
              <td data-label="Permissões">
                {item.permissions.length}{" "}
                {item.permissions.length === 1 ? "concedida" : "concedidas"}
              </td>
              <td data-label="Estado">
                <span
                  className={`badge ${item.status === "active" ? "badge-success" : "badge-warning"}`}
                >
                  {statusLabel(item.status)}
                </span>
              </td>
              <td className="appdir-open">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpen(item.id)}
                >
                  Abrir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
