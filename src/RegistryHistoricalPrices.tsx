import { SettingCard } from "./SupplierUi";
import { useState, type FormEvent } from "react";
import {
  ApiError,
  listRegistryHistoricalPrices,
  type RegistryHistoricalPrice,
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

export function RegistryHistoricalPrices({
  accountId,
  onUnauthorized,
}: {
  accountId: string;
  onUnauthorized: () => void;
}) {
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
      title="Prévia por cartório"
      help="Simulação de planejamento com custos importados do histórico. Não é cotação, não confirma tarifa atual e não gera PIX: a venda consulta a tarifa real do fornecedor. A visualização só calcula preço com tarifa vigente da API InfoSimples vinculada."
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
          Nome do cartório (opcional)
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
          {loading ? "Consultando…" : "Ver preços históricos"}
        </button>
      </form>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {applied && !loading && !items.length && !error && (
        <p className="form-hint">Nenhum cartório encontrado nesta página.</p>
      )}
      {items.length > 0 && (
        <>
          <p className="form-hint" role="status">
            {items.length} cartórios carregados · fórmula{" "}
            {offerVersion ?? "sem oferta vigente"}
          </p>
          <div className="sup-historical-scroll">
            <table className="sup-historical-table">
              <thead>
                <tr>
                  <th>Cartório</th>
                  <th>Último custo</th>
                  <th>Preço indicativo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.office_id}>
                    <td>
                      <strong>{item.office_name}</strong>
                      <small>
                        {item.city}/{item.state} · CNS {item.cns}
                      </small>
                    </td>
                    <td>
                      {item.observed_cost_cents === null
                        ? "Sem observação"
                        : money(item.observed_cost_cents)}
                      {item.observed_at && (
                        <small>{date.format(new Date(item.observed_at))}</small>
                      )}
                      {item.indicative_api_fee_cents !== null &&
                        item.indicative_api_fee_cents > 0 && (
                          <small>
                            API atual: {money(item.indicative_api_fee_cents)}
                          </small>
                        )}
                    </td>
                    <td>
                      {item.indicative_price_cents === null
                        ? "Não calculável"
                        : money(item.indicative_price_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cursor && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
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
