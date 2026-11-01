import type { OrganizationListItem } from "./api";
import { OrganizationAvatar } from "./OrganizationAvatar";
import { DirectoryStatus } from "./PartnerDirectoryStatus";

export function PartnerDirectoryTable({
  items,
  selectedId,
  onSummary,
  onSelect,
}: {
  items: OrganizationListItem[];
  selectedId: string | null;
  onSummary: (id: string) => void;
  onSelect: (organizationId: string) => void;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table partner-dir-table">
        <thead>
          <tr>
            <th scope="col">Parceiro</th>
            <th scope="col">Aplicações</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              data-clickable
              className={item.id === selectedId ? "selected" : undefined}
              onClick={() => onSummary(item.id)}
            >
              <td data-label="Parceiro">
                <button
                  className="partner-dir-name"
                  data-row-id={item.id}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSummary(item.id);
                  }}
                >
                  <OrganizationAvatar
                    id={item.id}
                    name={item.name}
                    logoUrl={item.logo_url}
                  />
                  <span className="partner-dir-name-text">
                    <strong>{item.name}</strong>
                    <small>{item.slug}</small>
                  </span>
                </button>
              </td>
              <td data-label="Aplicações">{item.applications_count}</td>
              <td data-label="Estado">
                <DirectoryStatus status={item.status} />
              </td>
              <td data-label="Ações" className="partner-dir-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(item.id);
                  }}
                >
                  Gerenciar <span aria-hidden="true">→</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
