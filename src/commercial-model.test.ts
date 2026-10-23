import { describe, expect, it } from "vitest";
import type { CommercialPolicy } from "./api";
import {
  countByStatus,
  describeAmount,
  filterPolicies,
  formatRate,
  formToDraftBody,
  initialForm,
  policyToForm,
  scopeSummary,
  validityState,
} from "./commercial-model";

const nbsp = (value: string) => value.replace(/ /g, " ");

function policy(overrides: Partial<CommercialPolicy> = {}): CommercialPolicy {
  return {
    id: "p1",
    organization_id: null,
    application_id: null,
    channel: "site",
    source: "number",
    item_code: "matricula",
    attribution: "public",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: "2026-12-31T00:00:00.000Z",
    discount_fixed_cents: 0,
    discount_rate_bps: 0,
    commission_fixed_cents: 0,
    commission_rate_bps: 0,
    status: "draft",
    published_at: null,
    suspended_at: null,
    ...overrides,
  };
}

describe("formatRate", () => {
  it("formats basis points as a pt-BR percentage", () => {
    expect(formatRate(0)).toBe("0%");
    expect(formatRate(1000)).toBe("10%");
    expect(formatRate(250)).toBe("2,5%");
    expect(formatRate(1234)).toBe("12,34%");
  });
});

describe("describeAmount", () => {
  it("shows a dash when both parts are zero", () => {
    expect(describeAmount(0, 0)).toBe("—");
  });

  it("shows only the non-zero part", () => {
    expect(describeAmount(1000, 0)).toBe("10%");
    expect(nbsp(describeAmount(0, 500))).toBe("R$ 5,00");
  });

  it("joins rate and fixed amount", () => {
    expect(nbsp(describeAmount(1000, 500))).toBe("10% + R$ 5,00");
  });
});

describe("validityState", () => {
  const from = "2026-03-01T00:00:00Z";
  const until = "2026-04-01T00:00:00Z";

  it("is future before the start, active inside, expired after the end", () => {
    expect(validityState(from, until, Date.parse("2026-02-01T00:00:00Z"))).toBe(
      "future",
    );
    expect(validityState(from, until, Date.parse("2026-03-15T00:00:00Z"))).toBe(
      "active",
    );
    expect(validityState(from, until, Date.parse("2026-05-01T00:00:00Z"))).toBe(
      "expired",
    );
  });
});

describe("countByStatus and filterPolicies", () => {
  const items = [
    policy({ id: "a", status: "draft" }),
    policy({ id: "b", status: "published", channel: "integration" }),
    policy({ id: "c", status: "published", channel: "site" }),
    policy({ id: "d", status: "suspended", channel: "promotion" }),
  ];

  it("counts every status plus the total", () => {
    expect(countByStatus(items)).toEqual({
      all: 4,
      draft: 1,
      published: 2,
      suspended: 1,
    });
  });

  it("filters by status, by channel and by both", () => {
    expect(filterPolicies(items, "published", "").map((p) => p.id)).toEqual([
      "b",
      "c",
    ]);
    expect(filterPolicies(items, "", "promotion").map((p) => p.id)).toEqual([
      "d",
    ]);
    expect(
      filterPolicies(items, "published", "integration").map((p) => p.id),
    ).toEqual(["b"]);
    expect(filterPolicies(items, "", "")).toHaveLength(4);
  });
});

describe("scopeSummary", () => {
  it("describes the direct site", () => {
    expect(scopeSummary(policy(), {})).toEqual({
      primary: "Site direto",
      secondary: "Todos os clientes",
    });
  });

  it("uses the organization name when known and the short id when not", () => {
    const integration = policy({
      channel: "integration",
      organization_id: "org-1",
      application_id: "app-1",
    });
    expect(scopeSummary(integration, { "org-1": "Cartório Alfa" })).toEqual({
      primary: "Cartório Alfa",
      secondary: "Integração · aplicação específica",
    });
    expect(scopeSummary(integration, {}).primary).toBe("Organização org-1");
  });

  it("labels coupon and link promotions", () => {
    expect(
      scopeSummary(policy({ channel: "promotion", attribution: "coupon" }), {})
        .primary,
    ).toBe("Cupom");
    expect(
      scopeSummary(policy({ channel: "promotion", attribution: "link" }), {})
        .primary,
    ).toBe("Link promocional");
  });
});

describe("formToDraftBody", () => {
  it("nulls organization and application for the site channel", () => {
    const form = {
      ...initialForm(),
      channel: "site" as const,
      organizationId: "org",
      applicationId: "app",
      reason: " motivo ",
    };
    const body = formToDraftBody(form);
    expect(body.organization_id).toBeNull();
    expect(body.application_id).toBeNull();
    expect(body.reason).toBe("motivo");
  });

  it("keeps the application only for integrations", () => {
    const base = {
      ...initialForm(),
      organizationId: "org",
      applicationId: "app",
    };
    expect(formToDraftBody({ ...base, channel: "integration" })).toMatchObject({
      organization_id: "org",
      application_id: "app",
    });
    expect(formToDraftBody({ ...base, channel: "promotion" })).toMatchObject({
      organization_id: "org",
      application_id: null,
    });
  });

  it("converts percentages to basis points and reais to cents", () => {
    const body = formToDraftBody({
      ...initialForm(),
      discountPercent: "10",
      discountReais: "5.5",
      commissionPercent: "2.5",
      commissionReais: "1",
    });
    expect(body).toMatchObject({
      discount_rate_bps: 1000,
      discount_fixed_cents: 550,
      commission_rate_bps: 250,
      commission_fixed_cents: 100,
    });
  });
});

describe("policyToForm", () => {
  it("round-trips a policy into the form and back to the same numeric values", () => {
    const source = policy({
      channel: "integration",
      organization_id: "org-1",
      application_id: "app-1",
      discount_rate_bps: 1250,
      discount_fixed_cents: 300,
      commission_rate_bps: 500,
      commission_fixed_cents: 0,
    });
    const body = formToDraftBody({ ...policyToForm(source), reason: "ajuste" });
    expect(body).toMatchObject({
      channel: "integration",
      organization_id: "org-1",
      application_id: "app-1",
      discount_rate_bps: 1250,
      discount_fixed_cents: 300,
      commission_rate_bps: 500,
      commission_fixed_cents: 0,
    });
  });
});
