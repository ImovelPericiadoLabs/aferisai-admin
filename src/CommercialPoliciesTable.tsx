import type { CommercialPolicy } from "./api";
import {
  describeAmount,
  scopeSummary,
  statusTone,
  validityState,
} from "./commercial-model";
import { itemLabel, sourceLabel, statusLabel } from "./display-labels";

const dateShort = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function CommercialPoliciesTable({
  visible,
  initialLoading,
  filtering,
  orgNames,
  selectedId,
  viewing,
  onOpen,
  onNew,
  onClearFilters,
}: {
  visible: CommercialPolicy[];
  initialLoading: boolean;
  filtering: boolean;
  orgNames: Record<string, string>;
  selectedId: string | null;
  viewing: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onClearFilters: () => void;
}) {
  return (
    <>
      {initialLoading ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          {Array.from({ length: 5 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {filtering
              ? "Nenhuma regra neste filtro"
              : "Nenhuma regra cadastrada"}
          </strong>
          <span>
            {filtering
              ? "Altere o estado ou o canal para ver outras versões."
              : "Crie a primeira regra para definir desconto e comissão por item e canal."}
          </span>
          {filtering ? (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={onClearFilters}
            >
              Limpar filtros
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={onNew}
            >
              Nova regra
            </button>
          )}
        </div>
      ) : (
        <div className="data-table-wrap">
          <table
            className="data-table rules-table"
            aria-label="Regras comerciais"
          >
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Escopo</th>
                <th scope="col">Vigência</th>
                <th scope="col">Desconto</th>
                <th scope="col">Comissão</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((policy) => {
                const scope = scopeSummary(policy, orgNames);
                const validity = validityState(
                  policy.valid_from,
                  policy.valid_until,
                );
                return (
                  <tr
                    key={policy.id}
                    data-clickable
                    className={
                      policy.id === selectedId && viewing
                        ? "selected"
                        : undefined
                    }
                    onClick={() => onOpen(policy.id)}
                  >
                    <td data-label="Item">
                      <button
                        className="rules-cell-button"
                        data-row-id={policy.id}
                        type="button"
                        aria-haspopup="dialog"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(policy.id);
                        }}
                      >
                        <strong>{itemLabel(policy.item_code)}</strong>
                        <small>{sourceLabel(policy.source)}</small>
                      </button>
                    </td>
                    <td data-label="Escopo">
                      <strong className="rules-cell-main">
                        {scope.primary}
                      </strong>
                      <small className="rules-cell-sub">
                        {scope.secondary}
                      </small>
                    </td>
                    <td data-label="Vigência">
                      <span className="rules-cell-stack">
                        <span className="rules-cell-main">
                          {dateShort.format(new Date(policy.valid_from))} –{" "}
                          {dateShort.format(new Date(policy.valid_until))}
                        </span>
                        <small className="rules-cell-sub">
                          {validity === "active"
                            ? "Vigente agora"
                            : validity === "future"
                              ? "Ainda não iniciou"
                              : "Encerrada"}
                        </small>
                      </span>
                    </td>
                    <td data-label="Desconto">
                      {describeAmount(
                        policy.discount_rate_bps,
                        policy.discount_fixed_cents,
                      )}
                    </td>
                    <td data-label="Comissão">
                      {describeAmount(
                        policy.commission_rate_bps,
                        policy.commission_fixed_cents,
                      )}
                    </td>
                    <td data-label="Estado">
                      <span className={`badge ${statusTone(policy.status)}`}>
                        {statusLabel(policy.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
