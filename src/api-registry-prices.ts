import { request } from "./api-core";

export type RegistryVisualizationTariff = {
  id: string;
  infosimples_account_id: string;
  onr_account_id: string;
  order_fee_cents: number;
  download_fee_cents: number;
  download_budget_count: number;
  monthly_minimum_reserve_cents: number;
  budget_cents: number;
  evidence_sha256: string;
  evidence_mode?: "supplier_file" | "admin_declaration";
  reason: string;
  verified_at: string;
  valid_until: string; /** True when the tariff has no automatic expiry (valid_until is a technical sentinel). */
  managed?: boolean;
  previous_id?: string | null;
};

export type TariffLimitRange = { min: number; max: number };

export type RegistryVisualizationTariffPage = {
  items: RegistryVisualizationTariff[];
  next_cursor: string | null;
  /** Inclusive bounds the backend enforces; absent on older releases. */
  limits?: {
    order_fee_cents?: TariffLimitRange;
    download_fee_cents?: TariffLimitRange;
    monthly_minimum_reserve_cents?: TariffLimitRange;
    reason_length?: TariffLimitRange;
    download_budget_count?: TariffLimitRange;
  };
};

export type RegistryVisualizationTariffCreate = {
  infosimples_account_id: string;
  onr_account_id: string;
  order_fee_cents: number;
  download_fee_cents: number;
  monthly_minimum_reserve_cents: number;
  evidence_mode: "supplier_file" | "admin_declaration";
  evidence_sha256: string | null;
  reason: string;
  contract_verified: true;
  supplier_fee_covered: true;
};

export const listRegistryVisualizationTariffs = (
  accountId: string,
  cursor?: string | null,
) =>
  request<RegistryVisualizationTariffPage>(
    `/v1/team/registry-visualization-tariffs?limit=20&account_id=${encodeURIComponent(accountId)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const publishRegistryVisualizationTariff = (
  body: RegistryVisualizationTariffCreate,
  csrfToken: string,
) =>
  request<RegistryVisualizationTariff>(
    "/v1/team/registry-visualization-tariffs",
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

export type RegistryHistoricalProduct =
  "visualizacao" | "inteiro_teor_simples" | "inteiro_teor";

export type RegistryHistoricalPrice = {
  office_id: string;
  office_name: string;
  city: string;
  state: string;
  cns: string;
  product: RegistryHistoricalProduct;
  observed_cost_cents: number | null;
  observed_at: string | null;
  cost_source: string | null;
  indicative_price_cents: number | null;
  indicative_payment_fee_cents: number | null;
  indicative_tax_cents: number | null;
  indicative_contribution_cents: number | null;
  indicative_api_fee_cents: number | null;
  breakdown?: RegistryPriceBreakdown | null;
};

export type RegistryPriceBreakdown = {
  onr_record_cost_cents: number;
  onr_markup_cents: number;
  api_fee_cents: number;
  analysis_reserve_cents: number;
  operations_reserve_cents: number;
  exception_reserve_cents: number;
  payment_fee_cents: number;
  tax_cents: number;
  /** Residual contribution beyond the ONR markup; may be zero. */
  contribution_cents: number;
  price_cents: number;
  formula_version: string;
  observed_at: string;
  cost_source: string;
};

export type RegistryHistoricalPricePage = {
  items: RegistryHistoricalPrice[];
  next_cursor: string | null;
  offer_version: string | null;
  indicative_only: true;
  quoteable: false;
};

export const listRegistryHistoricalPrices = (
  accountId: string,
  filters: {
    state: string;
    product: RegistryHistoricalProduct;
    search?: string;
    cursor?: string | null;
  },
) => {
  const query = new URLSearchParams({
    state: filters.state,
    product: filters.product,
    limit: "20",
  });
  if (filters.search) query.set("search", filters.search);
  if (filters.cursor) query.set("cursor", filters.cursor);
  return request<RegistryHistoricalPricePage>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/historical-price-previews?${query.toString()}`,
    { method: "GET" },
  );
};
