import type { PaymentExceptionCase } from "./api";
import {
  dueState,
  stageLabel,
  stageOf,
  type CaseFilter,
} from "./exception-model";
import { outcomeLabel } from "./ExceptionPanel";
import { money } from "./financial-exceptions-format";
import { stageTone } from "./status-tones";

export function FinancialExceptionsList({
  cases,
  visible,
  loading,
  loadFailed,
  filter,
  now,
  selectedId,
  open,
  person,
  onOpen,
  onFilter,
}: {
  cases: PaymentExceptionCase[];
  visible: PaymentExceptionCase[];
  loading: boolean;
  loadFailed: boolean;
  filter: CaseFilter;
  now: number;
  selectedId: string | null;
  open: boolean;
  person: (id: string | null) => string;
  onOpen: (id: string) => void;
  onFilter: (next: CaseFilter) => void;
}) {
  return (
    <>
      {loading && cases.length === 0 ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : visible.length === 0 && !loadFailed ? (
        <div className="empty-state" role="status">
          <strong>
            {filter === "all"
              ? "Nenhum caso financeiro aberto"
              : "Nenhum caso neste filtro"}
          </strong>
          <span>
            {filter === "all"
              ? "Quando um pagamento ficar sem entrega, o caso aparece aqui com prazo para decidir. Os resolvidos ficam em Concluídos."
              : "Escolha outro filtro para ver os demais casos."}
          </span>
          {filter !== "all" && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => onFilter("all")}
            >
              Limpar filtro
            </button>
          )}
        </div>
      ) : (
        visible.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Casos financeiros">
              <thead>
                <tr>
                  <th scope="col">Caso</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Prazo</th>
                  <th scope="col">Etapa</th>
                  <th scope="col">Responsáveis</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const stage = stageOf(item);
                  const due = dueState(item.due_at, now);
                  return (
                    <tr
                      key={item.id}
                      data-clickable
                      className={
                        item.id === selectedId && open ? "selected" : undefined
                      }
                      onClick={() => onOpen(item.id)}
                    >
                      <td data-label="Caso">
                        <button
                          className="rules-cell-button"
                          data-row-id={item.id}
                          type="button"
                          aria-haspopup="dialog"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpen(item.id);
                          }}
                        >
                          <strong>Caso {item.id.slice(0, 8)}</strong>
                          <small>Trabalho {item.work_id}</small>
                        </button>
                      </td>
                      <td data-label="Valor">{money(item.amount_cents)}</td>
                      <td data-label="Prazo">
                        {stage === "done" ? (
                          <span className="rules-cell-sub">Encerrado</span>
                        ) : (
                          <span
                            className={`badge badge-${due.tone === "neutral" ? "neutral" : due.tone}`}
                          >
                            {due.label}
                          </span>
                        )}
                      </td>
                      <td data-label="Etapa">
                        <span className="rules-cell-stack">
                          <span>
                            <span className={`badge ${stageTone(stage)}`}>
                              {stageLabel[stage]}
                            </span>
                          </span>
                          {(item.resolution ?? item.proposed_resolution) && (
                            <small className="rules-cell-sub">
                              {outcomeLabel(
                                item.resolution ?? item.proposed_resolution,
                              )}
                            </small>
                          )}
                        </span>
                      </td>
                      <td data-label="Responsáveis">
                        <span className="exc-people">
                          <small className="rules-cell-sub">
                            Gestor: {person(item.manager_assignee_id)}
                          </small>
                          <small className="rules-cell-sub">
                            Financeiro: {person(item.financial_assignee_id)}
                          </small>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
