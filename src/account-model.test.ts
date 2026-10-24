import { describe, expect, it } from "vitest";
import {
  priceBreakdown,
  readiness,
  type AccountSnapshot,
} from "./account-model";
import type {
  RegistryCommercialTerms,
  RegistryHistoricalPrice,
  RegistrySupplierAccount,
  RegistryVisualizationTariff,
} from "./api";

const NOW = Date.parse("2026-10-23T12:00:00Z");
const H = 3_600_000;

const account = (
  over: Partial<RegistrySupplierAccount> = {},
): RegistrySupplierAccount => ({
  id: "a1",
  label: "RI Digital",
  provider: "onr",
  account_binding_sha256: "x".repeat(64),
  credential_hint: "abc",
  status: "active",
  version: 2,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-23T00:00:00Z",
  ...over,
});
const tariff = (hoursLeft: number): RegistryVisualizationTariff => ({
  id: "t",
  infosimples_account_id: "i",
  onr_account_id: "o",
  order_fee_cents: 28,
  download_fee_cents: 20,
  download_budget_count: 3,
  monthly_minimum_reserve_cents: 0,
  budget_cents: 88,
  evidence_sha256: "a".repeat(64),
  reason: "x",
  verified_at: "2026-10-23T00:00:00Z",
  valid_until: new Date(NOW + hoursLeft * H).toISOString(),
});
const terms = (daysLeft: number): RegistryCommercialTerms => ({
  id: "c",
  onr_account_id: "a1",
  version: "v2",
  approved_at: null,
  valid_until: new Date(NOW + daysLeft * 24 * H).toISOString(),
  analysis_reserve_cents: 1630,
  operations_reserve_cents: 300,
  exception_reserve_cents: 200,
  payment_fee_cents: 199,
  payment_fee_rate_bps: 0,
  tax_rate_bps: 600,
  minimum_contribution_cents: 500,
  markup_bps: 0,
  onr_markup_bps: 5000,
  commercial_evidence_sha256: null,
});
const endpoint = {
  origin: "https://ridigital.org.br",
  mode: "official" as const,
  proxy_key_configured: false,
  version: 0,
};

const snap = (over: Partial<AccountSnapshot> = {}): AccountSnapshot => ({
  endpoint,
  tariff: tariff(30),
  terms: terms(20),
  loading: false,
  ...over,
});

describe("readiness", () => {
  it("is all ok for an active ONR account with current tariff and terms", () => {
    const rows = readiness(account(), snap(), NOW);
    expect(rows.map((r) => r.id)).toEqual([
      "status",
      "credential",
      "connection",
      "tariff",
      "terms",
    ]);
    expect(rows.every((r) => r.state === "ok")).toBe(true);
  });
  it("flags an inactive account and a missing or expired tariff", () => {
    expect(readiness(account({ status: "draft" }), snap(), NOW)[0].state).toBe(
      "warn",
    );
    expect(
      readiness(account(), snap({ tariff: null }), NOW).find(
        (r) => r.id === "tariff",
      )?.state,
    ).toBe("todo");
    expect(
      readiness(account(), snap({ tariff: tariff(-2) }), NOW).find(
        (r) => r.id === "tariff",
      )?.state,
    ).toBe("warn");
  });
  it("warns when the tariff expires within a day", () => {
    const row = readiness(account(), snap({ tariff: tariff(10) }), NOW).find(
      (r) => r.id === "tariff",
    );
    expect(row?.state).toBe("warn");
    expect(row?.detail).toMatch(/10 h/);
  });
  it("never counts down a tariff managed by the administrator", () => {
    const managed = { ...tariff(0), valid_until: "9999-12-31T00:00:00Z" };
    const row = readiness(account(), snap({ tariff: managed }), NOW).find(
      (r) => r.id === "tariff",
    );
    expect(row?.state).toBe("ok");
    expect(row?.detail).toBe("Vigente até atualização do gestor");
  });
  it("does not ask InfoSimples accounts for a connection or commercial terms", () => {
    const rows = readiness(
      account({ provider: "infosimples" }),
      snap({ endpoint: null, terms: null }),
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(["status", "credential", "tariff"]);
  });
  it("shows loading rows as pending instead of failing", () => {
    const rows = readiness(
      account(),
      snap({ loading: true, tariff: null, terms: null, endpoint: null }),
      NOW,
    );
    expect(rows.find((r) => r.id === "tariff")?.state).toBe("loading");
  });
});

const price = (
  over: Partial<RegistryHistoricalPrice> = {},
): RegistryHistoricalPrice => ({
  office_id: "o",
  office_name: "1º RI",
  city: "Curitiba",
  state: "PR",
  cns: "1",
  product: "visualizacao",
  observed_cost_cents: 1200,
  observed_at: "2026-10-01T10:00:00Z",
  cost_source: "x",
  indicative_price_cents: 3490,
  indicative_payment_fee_cents: 199,
  indicative_tax_cents: 209,
  indicative_contribution_cents: 900,
  indicative_api_fee_cents: 88,
  ...over,
});

describe("priceBreakdown", () => {
  it("lists the raw cost first and closes the sum with the remainder", () => {
    const b = priceBreakdown(price());
    expect(b.lines.map((l) => l.id)).toEqual([
      "cost",
      "api",
      "payment",
      "tax",
      "contribution",
      "remainder",
    ]);
    expect(b.lines[0].cents).toBe(1200);
    expect(b.lines.reduce((s, l) => s + l.cents, 0)).toBe(3490);
    expect(b.lines.find((l) => l.id === "remainder")?.cents).toBe(
      3490 - 1200 - 88 - 199 - 209 - 900,
    );
    expect(b.total).toBe(3490);
    expect(b.warning).toBeNull();
  });
  it("shares each line as basis points of the price", () => {
    const b = priceBreakdown(
      price({ indicative_price_cents: 10000, indicative_tax_cents: 600 }),
    );
    expect(b.lines.find((l) => l.id === "tax")?.shareBps).toBe(600);
  });
  it("leaves out an API fee of zero or null", () => {
    expect(
      priceBreakdown(price({ indicative_api_fee_cents: 0 })).lines.some(
        (l) => l.id === "api",
      ),
    ).toBe(false);
    expect(
      priceBreakdown(price({ indicative_api_fee_cents: null })).lines.some(
        (l) => l.id === "api",
      ),
    ).toBe(false);
  });
  it("cannot break down a price that was not calculable", () => {
    const b = priceBreakdown(price({ indicative_price_cents: null }));
    expect(b.total).toBeNull();
    expect(b.lines).toEqual([]);
  });
  it("warns when the known items already exceed the price", () => {
    const b = priceBreakdown(price({ indicative_price_cents: 1000 }));
    expect(b.warning).toMatch(/somam mais/);
  });
  it("treats a missing raw cost as zero but says so", () => {
    const b = priceBreakdown(price({ observed_cost_cents: null }));
    expect(b.lines[0].cents).toBe(0);
    expect(b.lines[0].note).toMatch(/sem observação/i);
  });
});
