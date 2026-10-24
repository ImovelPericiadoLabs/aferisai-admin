import { describe, expect, it } from "vitest";
import {
  activityLabel,
  fieldLabel,
  stepStates,
  diffEntries,
  breakdownLines,
  changeRatio,
  readiness,
  type AccountSnapshot,
} from "./account-model";
import type {
  RegistryPriceBreakdown,
  RegistrySupplierAccount,
  SupplierAccountSummary,
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

const summary = (
  over: Partial<SupplierAccountSummary> = {},
): SupplierAccountSummary => ({
  id: "a1",
  provider: "onr",
  status: "active",
  version: 2,
  last_credential_change_at: null,
  tariff: {
    id: "t",
    kind: "visualization_api",
    budget_cents: 88,
    managed: true,
    valid_until: null,
  },
  commercial_terms: {
    id: "c",
    version: "v2",
    valid_until: new Date(NOW + 20 * 24 * H).toISOString(),
  },
  endpoint: { mode: "official", key_configured: false },
  usage: {
    last_7_days: { orders: 3, cost_cents: null },
    last_30_days: { orders: 9, cost_cents: null },
    last_use_at: null,
    cost_status: "not_reconciled",
  },
  ...over,
});
const snap = (over: Partial<AccountSnapshot> = {}): AccountSnapshot => ({
  summary: summary(),
  loading: false,
  ...over,
});

describe("readiness", () => {
  it("is all ok for an active ONR account", () => {
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
  it("flags an inactive account and a missing tariff", () => {
    expect(readiness(account({ status: "draft" }), snap(), NOW)[0].state).toBe(
      "warn",
    );
    const none = snap({ summary: summary({ tariff: null }) });
    expect(
      readiness(account(), none, NOW).find((r) => r.id === "tariff")?.state,
    ).toBe("todo");
  });
  it("never counts down a managed tariff", () => {
    const row = readiness(account(), snap(), NOW).find(
      (r) => r.id === "tariff",
    );
    expect(row?.detail).toBe("Vigente até atualização do gestor");
  });
  it("counts down a dated tariff and warns when it is about to end", () => {
    const dated = summary({
      tariff: {
        id: "t",
        kind: "visualization_api",
        budget_cents: 88,
        managed: false,
        valid_until: new Date(NOW + 10 * H).toISOString(),
      },
    });
    const row = readiness(account(), snap({ summary: dated }), NOW).find(
      (r) => r.id === "tariff",
    );
    expect(row?.state).toBe("warn");
    expect(row?.detail).toMatch(/10 h/);
  });
  it("does not ask InfoSimples accounts for a connection or commercial terms", () => {
    const rows = readiness(
      account({ provider: "infosimples" }),
      snap({
        summary: summary({
          provider: "infosimples",
          endpoint: null,
          commercial_terms: null,
        }),
      }),
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(["status", "credential", "tariff"]);
  });
  it("shows loading rows as pending", () => {
    const rows = readiness(account(), { summary: null, loading: true }, NOW);
    expect(rows.find((r) => r.id === "tariff")?.state).toBe("loading");
  });
});

const parts = (
  over: Partial<RegistryPriceBreakdown> = {},
): RegistryPriceBreakdown => ({
  onr_record_cost_cents: 1200,
  onr_markup_cents: 600,
  api_fee_cents: 88,
  analysis_reserve_cents: 1630,
  operations_reserve_cents: 300,
  exception_reserve_cents: 200,
  payment_fee_cents: 199,
  tax_cents: 209,
  contribution_cents: 64,
  price_cents: 4490,
  formula_version: "v1",
  observed_at: "2026-10-01T10:00:00Z",
  cost_source: "portal",
  ...over,
});

describe("breakdownLines", () => {
  it("lists the raw cost first and closes on the price", () => {
    const view = breakdownLines(parts());
    expect(view.lines[0].id).toBe("cost");
    expect(view.lines.reduce((sum, line) => sum + line.cents, 0)).toBe(4490);
    expect(view.warning).toBeNull();
  });
  it("shares each line in basis points of the price", () => {
    const view = breakdownLines(parts({ price_cents: 10000, tax_cents: 600 }));
    expect(view.lines.find((l) => l.id === "tax")?.shareBps).toBe(600);
  });
  it("hides lines that are zero but keeps the raw cost", () => {
    const view = breakdownLines(
      parts({
        api_fee_cents: 0,
        contribution_cents: 0,
        onr_record_cost_cents: 0,
      }),
    );
    expect(view.lines.some((l) => l.id === "api")).toBe(false);
    expect(view.lines.some((l) => l.id === "contribution")).toBe(false);
    expect(view.lines[0].id).toBe("cost");
  });
  it("warns when the parts do not close the price", () => {
    expect(breakdownLines(parts({ price_cents: 5000 })).warning).toMatch(
      /não fecham/,
    );
  });
});

describe("changeRatio", () => {
  it("returns the change against the previous value in basis points", () => {
    expect(changeRatio(88, 80)).toBe(1000);
    expect(changeRatio(70, 80)).toBe(-1250);
  });
  it("has no ratio without a usable previous value", () => {
    expect(changeRatio(88, null)).toBeNull();
    expect(changeRatio(88, 0)).toBeNull();
  });
});

describe("activityLabel", () => {
  it("names the known actions and falls back to the raw code", () => {
    expect(activityLabel("visualization_tariff_published")).toBe(
      "Tarifa de visualização publicada",
    );
    expect(activityLabel("commercial_terms_published")).toBe(
      "Condições comerciais publicadas",
    );
    expect(activityLabel("algo_novo")).toBe("algo_novo");
  });
});

describe("diffEntries", () => {
  it("lists only what changed and formats money, percent and flags", () => {
    const rows = diffEntries(
      {
        budget_cents: 80,
        tax_rate_bps: 600,
        mode: "official",
        key_configured: false,
        same: 1,
      },
      {
        budget_cents: 88,
        tax_rate_bps: 650,
        mode: "proxy",
        key_configured: true,
        same: 1,
      },
    );
    expect(rows.map((r) => r.key)).toEqual([
      "budget_cents",
      "tax_rate_bps",
      "mode",
      "key_configured",
    ]);
    const plain = (text: string) => text.replace(/\u00a0/g, " ");
    expect(plain(rows[0].from)).toBe("R$ 0,80");
    expect(plain(rows[0].to)).toBe("R$ 0,88");
    expect(rows[1]).toMatchObject({ from: "6%", to: "6,5%" });
    expect(rows[3]).toMatchObject({ from: "Não", to: "Sim" });
  });
  it("shows a value that appeared as coming from nothing", () => {
    expect(diffEntries({}, { status: "active" })[0]).toMatchObject({
      from: "—",
      to: "active",
    });
  });
  it("is empty when nothing changed", () => {
    expect(diffEntries({ a: 1 }, { a: 1 })).toEqual([]);
  });
});

describe("stepStates", () => {
  it("marks finished steps, the first unfinished as current, and the rest as todo", () => {
    expect(stepStates([true, false, false])).toEqual([
      "done",
      "current",
      "todo",
    ]);
    expect(stepStates([false, true, false])).toEqual([
      "current",
      "done",
      "todo",
    ]);
  });
  it("has no current step when everything is done", () => {
    expect(stepStates([true, true])).toEqual(["done", "done"]);
  });
  it("starts at the first step when nothing is filled", () => {
    expect(stepStates([false, false])).toEqual(["current", "todo"]);
  });
});

describe("fieldLabel", () => {
  it("names the known fields and falls back to the raw key", () => {
    expect(fieldLabel("budget_cents")).toBe("Reserva da API");
    expect(fieldLabel("onr_markup_bps")).toBe("Margem ONR");
    expect(fieldLabel("campo_novo")).toBe("campo_novo");
  });
});
