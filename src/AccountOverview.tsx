import {
  readiness,
  type AccountSnapshot,
  type ReadinessState,
} from "./account-model";
import type {
  RegistryCommercialTerms,
  RegistrySupplierAccount,
  RegistryVisualizationTariff,
} from "./api";
import { Metrics, SettingCard } from "./SupplierUi";
import { supplierLabel } from "./supplier-model";
import { supplierTariffValidityLabel } from "./supplier-tariff-validity";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
const percent = (bps: number) =>
  `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const STATE_LABEL: Record<ReadinessState, string> = {
  ok: "Em ordem",
  warn: "Atenção",
  todo: "Pendente",
  loading: "Consultando",
};
const STATE_BADGE: Record<ReadinessState, string> = {
  ok: "success",
  warn: "warning",
  todo: "danger",
  loading: "neutral",
};

/** The terms that shape the price, as a flat table so nothing is hidden. */
export function termsRows(terms: RegistryCommercialTerms) {
  return [
    {
      label: "Reserva de IA por documento",
      value: money(terms.analysis_reserve_cents),
    },
    {
      label: "Reserva de operações",
      value: money(terms.operations_reserve_cents),
    },
    {
      label: "Reserva para exceções",
      value: money(terms.exception_reserve_cents),
    },
    {
      label: "Tarifa do PIX",
      value: `${money(terms.payment_fee_cents)}${terms.payment_fee_rate_bps ? ` + ${percent(terms.payment_fee_rate_bps)}` : ""}`,
    },
    { label: "Tributos", value: percent(terms.tax_rate_bps) },
    {
      label: "Margem sobre o custo do ONR",
      value: percent(terms.onr_markup_bps),
    },
    { label: "Margem geral", value: percent(terms.markup_bps) },
    {
      label: "Contribuição mínima",
      value: money(terms.minimum_contribution_cents),
    },
  ];
}

export function AccountOverview({
  account,
  snapshot,
  tariff,
  terms,
  now,
  onGoto,
}: {
  account: RegistrySupplierAccount;
  snapshot: AccountSnapshot;
  tariff: RegistryVisualizationTariff | null;
  terms: RegistryCommercialTerms | null;
  now: number;
  onGoto: (
    section: "credentials" | "connection" | "tariffs" | "commercial",
  ) => void;
}) {
  const rows = readiness(account, snapshot, now);
  const pending = rows.filter(
    (row) => row.state === "warn" || row.state === "todo",
  ).length;
  const usage = snapshot.summary?.usage ?? null;
  return (
    <>
      <SettingCard
        title="Prontidão da conta"
        help="O que precisa estar em ordem para esta conta ser usada em cotações. Ativar não valida o login no fornecedor nem autoriza compra."
        badge={
          snapshot.loading ? undefined : (
            <span className={`badge badge-${pending ? "warning" : "success"}`}>
              {pending
                ? `${pending} ${pending === 1 ? "ponto" : "pontos"} de atenção`
                : "Tudo em ordem"}
            </span>
          )
        }
      >
        <table className="sup-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Situação</th>
              <th>Detalhe</th>
              <th aria-label="Abrir" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.label}</td>
                <td>
                  <span className={`badge badge-${STATE_BADGE[row.state]}`}>
                    {STATE_LABEL[row.state]}
                  </span>
                </td>
                <td className="sup-muted">{row.detail}</td>
                <td className="sup-table-end">
                  {row.section && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onGoto(row.section!)}
                    >
                      Abrir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingCard>

      <div className="sup-grid-2">
        <SettingCard title="Conta">
          <Metrics
            items={[
              { label: "Fornecedor", value: supplierLabel(account.provider) },
              { label: "Credencial", value: account.credential_hint },
              { label: "Versão", value: account.version },
              {
                label: "Atualizada",
                value: dateTime.format(new Date(account.updated_at)),
              },
            ]}
          />
        </SettingCard>
        <SettingCard title="Custo da API">
          {tariff ? (
            <Metrics
              items={[
                { label: "Pedido", value: money(tariff.order_fee_cents) },
                {
                  label: `Download × ${tariff.download_budget_count}`,
                  value: money(tariff.download_fee_cents),
                },
                {
                  label: "Mínimo mensal",
                  value: money(tariff.monthly_minimum_reserve_cents),
                },
                {
                  label: "Reserva da API",
                  value: <strong>{money(tariff.budget_cents)}</strong>,
                },
                {
                  label: "Validade",
                  value: supplierTariffValidityLabel(tariff.valid_until),
                },
              ]}
            />
          ) : (
            <p className="sup-muted">
              {snapshot.loading ? "Consultando…" : "Nenhuma tarifa publicada."}
            </p>
          )}
        </SettingCard>
      </div>

      <SettingCard
        title="Uso da conta"
        help="Pedidos confirmados pela identidade desta conta. O custo real ainda não é conciliado por conta: o orçamento cotado não é gasto consumido, então não é somado aqui."
        badge={
          <span className="badge badge-neutral">Custo real não conciliado</span>
        }
      >
        {usage ? (
          <Metrics
            items={[
              { label: "Pedidos em 7 dias", value: usage.last_7_days.orders },
              { label: "Pedidos em 30 dias", value: usage.last_30_days.orders },
              {
                label: "Última utilização",
                value: usage.last_use_at
                  ? dateTime.format(new Date(usage.last_use_at))
                  : "Nunca usada",
              },
            ]}
          />
        ) : (
          <p className="sup-muted">
            {snapshot.loading
              ? "Consultando…"
              : "Não foi possível carregar o uso."}
          </p>
        )}
      </SettingCard>

      {account.provider === "onr" && (
        <SettingCard
          title="Parâmetros do preço"
          help="Valores das condições comerciais vigentes que entram na cotação de um pedido registral. A abertura cartório a cartório está em “Composição do preço”."
          badge={
            terms && (
              <span className="badge badge-neutral">{terms.version}</span>
            )
          }
        >
          {terms ? (
            <dl className="sup-kv">
              {termsRows(terms).map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="sup-muted">
              {snapshot.loading
                ? "Consultando…"
                : "Sem oferta completa vigente."}
            </p>
          )}
        </SettingCard>
      )}
    </>
  );
}
