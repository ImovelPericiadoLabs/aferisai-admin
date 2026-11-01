import type { ReactNode } from "react";
import type { Application } from "./application-workspace-model";

export function ApplicationDirectory({
  applications,
  hasMoreApplications,
  loadingMoreApplications,
  additionalApplication,
  showCreate,
  onOpen,
  onLoadMoreApplications,
  onToggleCreate,
}: {
  applications: Application[];
  hasMoreApplications: boolean;
  loadingMoreApplications: boolean;
  additionalApplication: ReactNode;
  showCreate: boolean;
  onOpen: (id: string) => void;
  onLoadMoreApplications?: () => void;
  onToggleCreate: () => void;
}) {
  return (
    <section className="appws" aria-labelledby="appws-directory-title">
      <header className="appws-head">
        <div>
          <h2 className="appws-title" id="appws-directory-title">
            Aplicações
          </h2>
          <p className="page-subtitle">
            Escolha a integração que deseja consultar ou configurar.
          </p>
        </div>
      </header>
      <div className="data-table-wrap">
        <table className="data-table" aria-label="Aplicações">
          <thead>
            <tr>
              <th scope="col">Aplicação</th>
              <th scope="col">Estado</th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((item) => (
              <tr key={item.id}>
                <td data-label="Aplicação">
                  <button
                    type="button"
                    className="rules-cell-button"
                    onClick={() => onOpen(item.id)}
                  >
                    <strong>{item.name}</strong>
                  </button>
                </td>
                <td data-label="Estado">
                  <span
                    className={`badge ${item.status === "active" ? "badge-success" : "badge-warning"}`}
                  >
                    {item.status === "active" ? "Ativa" : "Suspensa"}
                  </span>
                </td>
                <td className="appws-open">
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
      {hasMoreApplications && onLoadMoreApplications && (
        <button
          type="button"
          className="btn btn-secondary btn-md appws-more"
          disabled={loadingMoreApplications}
          onClick={onLoadMoreApplications}
        >
          {loadingMoreApplications ? "Carregando…" : "Carregar mais aplicações"}
        </button>
      )}
      {additionalApplication && (
        <div className="appws-additional">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={onToggleCreate}
          >
            {showCreate ? "Fechar cadastro" : "Nova aplicação"}
          </button>
          {showCreate && additionalApplication}
        </div>
      )}
    </section>
  );
}
