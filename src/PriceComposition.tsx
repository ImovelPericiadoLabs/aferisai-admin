import { Fragment, useState, type FormEvent } from "react";
import { priceBreakdown } from "./account-model";
import { termsRows } from "./AccountOverview";
import { SettingCard } from "./SupplierUi";
import {
  ApiError,
  listRegistryHistoricalPrices,
  type RegistryHistoricalPrice,
  type RegistryCommercialTerms,
  type RegistryHistoricalProduct,
} from "./api";

const products: { value: RegistryHistoricalProduct; label: string }[] = [
  { value: "inteiro_teor_simples", label: "Inteiro teor simples" },
  { value: "inteiro_teor", label: "Inteiro teor" },
  { value: "visualizacao", label: "Visualização de matrícula" },
];
const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function PriceComposition({
  accountId,
  terms,
  onUnauthorized,
}: {
  accountId: string;
  terms: RegistryCommercialTerms | null;
  onUnauthorized: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [state, setState] = useState("SP");
  const [product, setProduct] = useState<RegistryHistoricalProduct>(
    "inteiro_teor_simples",
  );
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState<{
    state: string;
    product: RegistryHistoricalProduct;
    search?: string;
  } | null>(null);
  const [items, setItems] = useState<RegistryHistoricalPrice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [offerVersion, setOfferVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(
    filters: NonNullable<typeof applied>,
    next?: string | null,
  ) {
    setLoading(true);
    try {
      const page = await listRegistryHistoricalPrices(accountId, {
        ...filters,
        cursor: next,
      });
      setItems((previous) =>
        next ? [...previous, ...page.items] : page.items,
      );
      setCursor(page.next_cursor);
      setOfferVersion(page.offer_version);
      setError("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível consultar o histórico. Tente novamente.",
        );
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedState = state.trim().toUpperCase();
    const normalizedSearch = search.trim();
    if (!/^[A-Z]{2}$/.test(normalizedState)) {
      setError("Informe uma UF com duas letras.");
      return;
    }
    if (normalizedSearch.length === 1) {
      setError("Use pelo menos duas letras na busca ou deixe o campo vazio.");
      return;
    }
    const filters = {
      state: normalizedState,
      product,
      search: normalizedSearch || undefined,
    };
    setApplied(filters);
    setItems([]);
    setCursor(null);
    void load(filters);
  }

  return (
    <SettingCard
      title="Composição do preço"
      help="Abre o preço indicativo de cada cartório em partes: o valor cru cobrado pelo cartório, a tarifa da API, o PIX, os tributos e a contribuição. Reservas e margem aparecem como a diferença até o preço. É uma simulação: a venda consulta a tarifa real do fornecedor."
    >
      <form className="sup-historical-filters" onSubmit={submit}>
        <label>
          UF
          <input
            className="input"
            value={state}
            maxLength={2}
            autoCapitalize="characters"
            onChange={(event) => setState(event.target.value)}
          />
        </label>
        <label>
          Produto
          <select
            className="input"
            value={product}
            onChange={(event) =>
              setProduct(event.target.value as RegistryHistoricalProduct)
            }
          >
            {products.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cartório (opcional)
          <input
            className="input"
            value={search}
            maxLength={80}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button
          className="btn btn-primary btn-md"
          type="submit"
          disabled={loading}
        >
          {loading ? "Consultando…" : "Simular preços"}
        </button>
      </form>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {applied && !loading && !items.length && !error && (
        <p className="sup-muted">Nenhum cartório encontrado nesta página.</p>
      )}
      {items.length > 0 && (
        <>
          <p className="sup-muted" role="status">
            {items.length} cartórios · fórmula{" "}
            {offerVersion ?? "sem oferta vigente"} · clique numa linha para ver
            o cálculo
          </p>
          <div className="sup-historical-scroll">
            <table className="sup-table sup-table-click">
              <thead>
                <tr>
                  <th>Cartório</th>
                  <th className="sup-table-end">Custo cru</th>
                  <th className="sup-table-end">API</th>
                  <th className="sup-table-end">PIX</th>
                  <th className="sup-table-end">Tributos</th>
                  <th className="sup-table-end">Contribuição</th>
                  <th className="sup-table-end">Preço</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isOpen = open === item.office_id;
                  const cents = (value: number | null) =>
                    value === null ? "—" : money(value);
                  return (
                    <Fragment key={item.office_id}>
                      <tr
                        tabIndex={0}
                        aria-expanded={isOpen}
                        data-open={isOpen ? "true" : undefined}
                        onClick={() => setOpen(isOpen ? null : item.office_id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setOpen(isOpen ? null : item.office_id);
                          }
                        }}
                      >
                        <td>
                          <strong className="sup-clip">
                            {item.office_name}
                          </strong>
                          <small className="sup-muted sup-clip">
                            {item.city}/{item.state} · CNS {item.cns}
                          </small>
                        </td>
                        <td className="sup-table-end">
                          {cents(item.observed_cost_cents)}
                        </td>
                        <td className="sup-table-end">
                          {cents(item.indicative_api_fee_cents)}
                        </td>
                        <td className="sup-table-end">
                          {cents(item.indicative_payment_fee_cents)}
                        </td>
                        <td className="sup-table-end">
                          {cents(item.indicative_tax_cents)}
                        </td>
                        <td className="sup-table-end">
                          {cents(item.indicative_contribution_cents)}
                        </td>
                        <td className="sup-table-end">
                          <strong>
                            {item.indicative_price_cents === null
                              ? "Não calculável"
                              : money(item.indicative_price_cents)}
                          </strong>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="sup-table-detail">
                          <td colSpan={7}>
                            <Breakdown item={item} terms={terms} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {cursor && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={loading}
              onClick={() => applied && void load(applied, cursor)}
            >
              {loading ? "Carregando…" : "Carregar mais cartórios"}
            </button>
          )}
        </>
      )}
    </SettingCard>
  );
}

const LINE_TONE: Record<string, string> = {
  cost: "cost",
  api: "api",
  payment: "fee",
  tax: "tax",
  contribution: "gain",
  remainder: "rest",
};

function Breakdown({
  item,
  terms,
}: {
  item: RegistryHistoricalPrice;
  terms: RegistryCommercialTerms | null;
}) {
  const breakdown = priceBreakdown(item);
  if (breakdown.total === null)
    return (
      <p className="sup-muted">
        Este cartório não tem preço calculável com a oferta e as tarifas atuais.
      </p>
    );
  return (
    <div className="sup-breakdown">
      <div className="sup-breakdown-main">
        <div className="sup-stack" role="img" aria-label="Composição do preço">
          {breakdown.lines
            .filter((line) => line.cents > 0)
            .map((line) => (
              <span
                key={line.id}
                data-tone={LINE_TONE[line.id]}
                style={{ width: `${line.shareBps / 100}%` }}
                title={`${line.label}: ${money(line.cents)}`}
              />
            ))}
        </div>
        <table className="sup-table sup-table-compact">
          <thead>
            <tr>
              <th>Parte do preço</th>
              <th>Origem</th>
              <th className="sup-table-end">Valor</th>
              <th className="sup-table-end">% do preço</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <span
                    className="sup-dot"
                    data-tone={LINE_TONE[line.id]}
                    aria-hidden="true"
                  />
                  {line.label}
                  {line.note && (
                    <small className="sup-muted">{line.note}</small>
                  )}
                </td>
                <td className="sup-muted">
                  {line.source === "backend" ? "Backend" : "Calculado"}
                </td>
                <td className="sup-table-end">{money(line.cents)}</td>
                <td className="sup-table-end">
                  {(line.shareBps / 100).toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Preço indicativo</td>
              <td className="sup-table-end">{money(breakdown.total)}</td>
              <td className="sup-table-end">100,0%</td>
            </tr>
          </tfoot>
        </table>
        {breakdown.warning && (
          <p className="alert alert-warning" role="alert">
            {breakdown.warning}
          </p>
        )}
        {item.observed_at && (
          <p className="sup-muted">
            Custo cru observado em {date.format(new Date(item.observed_at))}
            {item.cost_source ? ` · fonte ${item.cost_source}` : ""}.
          </p>
        )}
      </div>
      <aside className="sup-breakdown-side" aria-label="Condições aplicadas">
        <h4>Condições aplicadas</h4>
        {terms ? (
          <dl className="sup-kv sup-kv-compact">
            {termsRows(terms).map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="sup-muted">Sem condições comerciais vigentes.</p>
        )}
      </aside>
    </div>
  );
}
