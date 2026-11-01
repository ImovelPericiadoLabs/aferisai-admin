import type { RegistryVisualizationTariff } from "./api";
import { Delta, InlinePanel } from "./SupplierUi";
import { money, tariffStatus } from "./registry-visualization-tariffs-model";

export function VisualizationTariffHistory({
  open,
  tariffs,
  cursor,
  loading,
  previousOf,
  accountLabel,
  onClose,
  onLoadMore,
}: {
  open: boolean;
  tariffs: RegistryVisualizationTariff[];
  cursor: string | null;
  loading: boolean;
  previousOf: (
    item: RegistryVisualizationTariff,
  ) => RegistryVisualizationTariff | null;
  accountLabel: (id: string) => string;
  onClose: () => void;
  onLoadMore: (cursor: string) => void;
}) {
  return (
    <InlinePanel
      open={open}
      title="Histórico de tarifas"
      onClose={onClose}
      footer={
        cursor ? (
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={loading}
            onClick={() => onLoadMore(cursor)}
          >
            Carregar versões anteriores
          </button>
        ) : undefined
      }
    >
      <ol className="sup-history">
        {tariffs.map((item) => (
          <li key={item.id}>
            <strong>{money(item.budget_cents)}</strong>
            <span>
              {tariffStatus(item)}{" "}
              <Delta
                current={item.budget_cents}
                previous={previousOf(item)?.budget_cents}
              />
            </span>
            <small className="sup-clip">
              {accountLabel(item.onr_account_id)} +{" "}
              {accountLabel(item.infosimples_account_id)}
            </small>
          </li>
        ))}
      </ol>
    </InlinePanel>
  );
}
