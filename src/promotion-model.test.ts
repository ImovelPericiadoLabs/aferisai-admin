import { describe, expect, it } from "vitest";
import type { PromotionAsset } from "./api";
import {
  countByState,
  filterPromotions,
  initialPromotionForm,
  promotionState,
  usageOf,
  validatePromotionForm,
} from "./promotion-model";

const NOW = Date.parse("2026-10-23T12:00:00Z");

function asset(overrides: Partial<PromotionAsset> = {}): PromotionAsset {
  return {
    id: "a1",
    policy_version_id: "p1",
    organization_id: "o1",
    kind: "coupon",
    public_label: null,
    valid_from: "2026-10-01T00:00:00Z",
    valid_until: "2026-11-01T00:00:00Z",
    use_limit: null,
    use_count: 0,
    status: "active",
    suspended_at: null,
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

describe("promotionState", () => {
  it("is active inside the window", () => {
    expect(promotionState(asset(), NOW)).toBe("active");
  });
  it("is scheduled before the start and expired after the end", () => {
    expect(
      promotionState(
        asset({
          valid_from: "2026-11-01T00:00:00Z",
          valid_until: "2026-12-01T00:00:00Z",
        }),
        NOW,
      ),
    ).toBe("scheduled");
    expect(
      promotionState(asset({ valid_until: "2026-10-10T00:00:00Z" }), NOW),
    ).toBe("expired");
  });
  it("is exhausted when the limit is reached", () => {
    expect(promotionState(asset({ use_limit: 5, use_count: 5 }), NOW)).toBe(
      "exhausted",
    );
    expect(promotionState(asset({ use_limit: 5, use_count: 4 }), NOW)).toBe(
      "active",
    );
  });
  it("suspended wins over everything", () => {
    expect(
      promotionState(
        asset({
          status: "suspended",
          use_limit: 1,
          use_count: 1,
          valid_until: "2026-10-10T00:00:00Z",
        }),
        NOW,
      ),
    ).toBe("suspended");
  });
});

describe("usageOf", () => {
  it("shows count of limit with a fraction", () => {
    expect(usageOf(asset({ use_limit: 100, use_count: 25 }))).toEqual({
      text: "25 de 100",
      fraction: 0.25,
    });
  });
  it("has no fraction without a limit", () => {
    expect(usageOf(asset({ use_count: 3 }))).toEqual({
      text: "3 · sem limite",
      fraction: null,
    });
  });
  it("caps the fraction at 1", () => {
    expect(usageOf(asset({ use_limit: 2, use_count: 9 })).fraction).toBe(1);
  });
});

describe("countByState and filterPromotions", () => {
  const items = [
    asset({ id: "a" }),
    asset({ id: "b", status: "suspended" }),
    asset({ id: "c", valid_until: "2026-10-10T00:00:00Z" }),
  ];
  it("counts each state plus the total", () => {
    expect(countByState(items, NOW)).toEqual({
      all: 3,
      active: 1,
      scheduled: 0,
      exhausted: 0,
      expired: 1,
      suspended: 1,
    });
  });
  it("filters by state", () => {
    expect(filterPromotions(items, "suspended", NOW).map((x) => x.id)).toEqual([
      "b",
    ]);
    expect(filterPromotions(items, "", NOW)).toHaveLength(3);
  });
});

describe("validatePromotionForm", () => {
  const base = {
    ...initialPromotionForm(new Date("2026-10-23T12:00:00Z")),
    policyVersionId: "p1",
    organizationId: "o1",
  };
  it("builds the request body", () => {
    const result = validatePromotionForm({
      ...base,
      publicLabel: " Black ",
      useLimit: "50",
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.body).toMatchObject({
        policy_version_id: "p1",
        organization_id: "o1",
        kind: "coupon",
        public_label: "Black",
        use_limit: 50,
      });
  });
  it("requires rule and organization", () => {
    expect(validatePromotionForm({ ...base, policyVersionId: "" }).ok).toBe(
      false,
    );
    expect(validatePromotionForm({ ...base, organizationId: "" }).ok).toBe(
      false,
    );
  });
  it("requires the end after the start", () => {
    const result = validatePromotionForm({
      ...base,
      validUntil: base.validFrom,
    });
    expect(result).toEqual({
      ok: false,
      message: "O fim da validade precisa ser depois do início.",
    });
  });
  it("accepts an empty limit but rejects zero, decimals and negatives", () => {
    expect(validatePromotionForm({ ...base, useLimit: "" }).ok).toBe(true);
    for (const bad of ["0", "1.5", "-2", "abc"])
      expect(validatePromotionForm({ ...base, useLimit: bad }).ok).toBe(false);
  });
  it("rejects labels over 200 characters", () => {
    expect(
      validatePromotionForm({ ...base, publicLabel: "x".repeat(201) }).ok,
    ).toBe(false);
  });
});
