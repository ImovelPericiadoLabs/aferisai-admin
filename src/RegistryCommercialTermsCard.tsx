import type {
  RegistryCommercialTerms as Terms,
  RegistryCommercialTermsCreate,
} from "./api";
import { InlinePanel, Metrics, SettingCard } from "./SupplierUi";
import {
  dateTime,
  money,
  type NumericKey,
} from "./registry-commercial-terms-model";

export function RegistryCommercialTermsCard({
  effective,
  history,
  cursor,
  loading,
  busy,
  error,
  formOpen,
  active,
  draft,
  numericInputs,
  historyOpen,
  onHistoryOpenChange,
  onReload,
  onNewVersion,
}: {
  effective: Terms | null;
  history: Terms[];
  cursor: string | null;
  loading: boolean;
  busy: boolean;
  error: string;
  formOpen: boolean;
  active: boolean;
  draft: RegistryCommercialTermsCreate | null;
  numericInputs: Record<NumericKey, string> | null;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  onReload: (next?: string) => void;
  onNewVersion: () => void;
}) {
  return (
    <>
      <SettingCard
        title="Condições da cotação"
        help="Cada publicação vale para novas cotações desta conta. Preços já cotados conservam a versão em que nasceram."
        badge={
          effective && (
            <span className="badge badge-success">
              Vigente até {dateTime.format(new Date(effective.valid_until))}
            </span>
          )
        }
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-md"
              disabled={loading || busy}
              onClick={() => onReload()}
            >
              Atualizar
            </button>
            {history.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => onHistoryOpenChange(true)}
              >
                Histórico ({history.length})
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-md"
              aria-haspopup="dialog"
              disabled={!active || !draft || !effective || !numericInputs}
              title={!active ? "Ative a conta para publicar." : undefined}
              onClick={onNewVersion}
            >
              Nova versão
            </button>
          </>
        }
      >
        {loading && (
          <p role="status" className="sup-muted">
            Carregando condições…
          </p>
        )}
        {error && !formOpen && (
          <p className="alert alert-danger" role="alert">
            {error}
          </p>
        )}
        {!loading && effective && (
          <>
            <Metrics
              items={[
                {
                  label: "IA por documento",
                  value: money(effective.analysis_reserve_cents),
                },
                {
                  label: "Margem ONR",
                  value: `${(effective.onr_markup_bps / 100).toLocaleString("pt-BR")}%`,
                },
                {
                  label: "Tributos",
                  value: `${(effective.tax_rate_bps / 100).toLocaleString("pt-BR")}%`,
                },
                {
                  label: "Tarifa PIX",
                  value: money(effective.payment_fee_cents),
                },
              ]}
            />
            <p className="sup-muted sup-clip">
              Versão <code>{effective.version}</code>
              {effective.onr_account_id === null &&
                " · geral anterior; publique uma desta conta para personalizar"}
            </p>
            <div
              className="sup-analysis-availability"
              aria-label="Disponibilidade da IA por documento"
            >
              <div>
                <strong>
                  {effective.analysis_planned_calls > 0
                    ? "IA disponível"
                    : "IA indisponível"}
                </strong>
                <span>
                  {effective.analysis_planned_calls > 0
                    ? `${effective.analysis_planned_calls} chamadas planejadas por documento`
                    : "O orçamento de IA não está completo"}
                </span>
              </div>
              <div>
                <strong>Como é calculado</strong>
                <span>
                  {effective.analysis_planned_calls} chamadas ×{" "}
                  {money(effective.analysis_call_reserve_cents)} ={" "}
                  {money(effective.analysis_reserve_cents)} por documento
                </span>
              </div>
            </div>
          </>
        )}
        {!loading && !effective && (
          <p className="sup-muted">
            Sem oferta completa vigente. Publique antes o orçamento de IA e a
            tarifa no backend.
          </p>
        )}
      </SettingCard>

      <InlinePanel
        open={historyOpen}
        title="Histórico da conta"
        onClose={() => onHistoryOpenChange(false)}
        footer={
          cursor ? (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={loading}
              onClick={() => onReload(cursor)}
            >
              Carregar versões anteriores
            </button>
          ) : undefined
        }
      >
        <ol className="sup-history">
          {history.map((item) => (
            <li key={item.id}>
              <strong className="sup-clip">{item.version}</strong>
              <span>
                ONR {(item.onr_markup_bps / 100).toLocaleString("pt-BR")}% ·
                tributos {(item.tax_rate_bps / 100).toLocaleString("pt-BR")}%
              </span>
            </li>
          ))}
        </ol>
      </InlinePanel>
    </>
  );
}
