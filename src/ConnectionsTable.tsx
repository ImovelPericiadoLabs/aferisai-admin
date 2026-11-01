import type { TeamConnection } from "./api";
import { scopeLabel } from "./display-labels";

function ScopeBadge({ scope }: { scope: string }) {
  const isAnalysis = scope.startsWith("analysis:");
  return (
    <span className={`badge ${isAnalysis ? "badge-blue" : "badge-gray"}`}>
      {scopeLabel(scope)}
    </span>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function ConnectionsTable({
  items,
  canRevoke,
  revoking,
  onRevoke,
}: {
  items: TeamConnection[];
  canRevoke: boolean;
  revoking: boolean;
  onRevoke: (id: string) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table" aria-label="Conexões ativas">
        <thead>
          <tr>
            <th>ID da conexão</th>
            <th>ID do titular</th>
            <th>ID da aplicação</th>
            <th>Escopos</th>
            <th>Versão</th>
            <th>Conectado em</th>
            {canRevoke && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <code className="code-id">{item.id}</code>
              </td>
              <td>
                <code className="code-id">{item.user_id}</code>
              </td>
              <td>
                <code className="code-id">{item.application_id}</code>
              </td>
              <td>
                <div
                  style={{
                    display: "flex",
                    gap: "0.3rem",
                    flexWrap: "wrap",
                  }}
                >
                  {item.scopes.map((s) => (
                    <ScopeBadge key={s} scope={s} />
                  ))}
                </div>
              </td>
              <td>{item.grant_version}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                {formatDate(item.granted_at)}
              </td>
              {canRevoke && (
                <td>
                  <button
                    type="button"
                    className="button secondary"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.3rem 0.7rem",
                    }}
                    disabled={revoking}
                    onClick={() => onRevoke(item.id)}
                  >
                    Revogar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
