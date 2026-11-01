import type { ApplicationBulkResult } from "./api";
import {
  outcomeLabel,
  reasonLabel,
  type Application,
} from "./application-directory-model";

export function ApplicationBulkResultPanel({
  result,
  applications,
  onFinish,
}: {
  result: ApplicationBulkResult;
  applications: Application[];
  onFinish: () => void;
}) {
  return (
    <section className="card appdir-block" role="status">
      <h4>Resultado por aplicação</h4>
      <p className="form-hint">
        {result.affected_count} de {result.selected_count} aplicações alteradas.
        Confira o resultado individual abaixo.
      </p>
      <div className="data-table-wrap">
        <table className="data-table" aria-label="Resultado">
          <thead>
            <tr>
              <th scope="col">Aplicação</th>
              <th scope="col">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.application_id}>
                <td data-label="Aplicação">
                  <strong>
                    {applications.find((app) => app.id === item.application_id)
                      ?.name ?? "Aplicação indisponível"}
                  </strong>
                </td>
                <td data-label="Resultado">
                  <span
                    className={`badge ${item.outcome === "applied" ? "badge-success" : item.outcome === "no_change" ? "badge-neutral" : "badge-warning"}`}
                  >
                    {outcomeLabel(item.outcome)}
                  </span>
                  {reasonLabel(item.reason) && (
                    <small className="rules-cell-sub">
                      {reasonLabel(item.reason)}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="appdir-actions">
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={onFinish}
        >
          Concluir
        </button>
      </div>
    </section>
  );
}
