import type { AnalysisProviderAccount } from "./api";
import { kindLabels } from "./AnalysisProviderPanel";
import { statusLabel } from "./display-labels";
import { formatCostPerDay } from "./provider-model";
import { providerStatusTone } from "./status-tones";
import type { Drawer } from "./analysis-providers-model";

export function AnalysisProvidersTable({
  visible,
  selectedId,
  drawer,
  onOpen,
}: {
  visible: AnalysisProviderAccount[];
  selectedId: string | null;
  drawer: Drawer;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table prov-table" aria-label="Contas de provedor">
        <thead>
          <tr>
            <th scope="col">Conta</th>
            <th scope="col">Modelo</th>
            <th scope="col">Pool</th>
            <th scope="col">Estado</th>
            <th scope="col">Limites</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => (
            <tr
              key={item.id}
              data-clickable
              className={
                item.id === selectedId && drawer === "view"
                  ? "selected"
                  : undefined
              }
              onClick={() => onOpen(item.id)}
            >
              <td data-label="Conta">
                <button
                  className="prov-name"
                  type="button"
                  data-row-id={item.id}
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(item.id);
                  }}
                >
                  <strong>{item.label}</strong>
                  <small>{kindLabels[item.kind]}</small>
                </button>
              </td>
              <td data-label="Modelo">{item.model}</td>
              <td data-label="Pool">{item.pool_key}</td>
              <td data-label="Estado">
                <span className={`badge ${providerStatusTone(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </td>
              <td data-label="Limites">
                <span className="prov-limit">
                  {formatCostPerDay(item.daily_cost_cents)}
                </span>
                <small className="prov-limit-sub">
                  {item.rpm} req/min · prioridade {item.priority}
                </small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
