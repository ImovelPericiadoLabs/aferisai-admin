import { describe, expect, it } from "vitest";
import { ApiError, type AnalysisProviderAccount } from "./api";
import {
  activationBody,
  canActivate,
  validateProfileHash,
  formToLimits,
  formatCostPerDay,
  isVersionConflict,
  limitsToForm,
  shortHash,
  validateExternalReserved,
  type LimitsForm,
} from "./provider-model";

const limits = {
  max_concurrent: 1,
  daily_limit: 100,
  rpm: 10,
  tpm: 10000,
  daily_cost_cents: 1000,
  priority: 100,
};

const valid: LimitsForm = limitsToForm(limits);

function account(
  overrides: Partial<AnalysisProviderAccount> = {},
): AnalysisProviderAccount {
  return {
    ...limits,
    id: "p1",
    label: "Conta",
    kind: "vertex_service_account",
    model: "gemini-3.5-flash-lite",
    location: "global",
    pool_key: "gcp:projeto",
    execution_profile_sha256: "a".repeat(64),
    credential_hint: "ab12",
    base_url: null,
    status: "draft",
    version: 3,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

describe("limitsToForm / formToLimits", () => {
  it("shows the daily cost in reais with two decimals", () => {
    expect(valid.dailyCostReais).toBe("10.00");
  });

  it("round-trips a valid limits object", () => {
    const result = formToLimits(valid);
    expect(result).toEqual({ ok: true, limits });
  });

  it("rejects concurrency outside 1-100", () => {
    for (const bad of ["0", "101"]) {
      const result = formToLimits({ ...valid, maxConcurrent: bad });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.field).toBe("maxConcurrent");
    }
  });

  it("accepts priority 0 and rejects 1001", () => {
    expect(formToLimits({ ...valid, priority: "0" }).ok).toBe(true);
    const bad = formToLimits({ ...valid, priority: "1001" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.field).toBe("priority");
  });

  it("rejects non-positive or non-numeric daily cost", () => {
    for (const bad of ["0", "abc", ""]) {
      const result = formToLimits({ ...valid, dailyCostReais: bad });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.field).toBe("dailyCostReais");
    }
  });

  it("rounds the cost to whole cents", () => {
    const result = formToLimits({ ...valid, dailyCostReais: "12.345" });
    expect(result.ok && result.limits.daily_cost_cents).toBe(1235);
  });

  it("reports the first invalid field in form order", () => {
    const result = formToLimits({ ...valid, rpm: "0", maxConcurrent: "0" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("maxConcurrent");
  });

  it("rejects fractional counts", () => {
    const result = formToLimits({ ...valid, rpm: "1.5" });
    expect(result.ok).toBe(false);
  });
});

describe("formatCostPerDay", () => {
  it("formats cents as reais per day", () => {
    expect(formatCostPerDay(1000).replace(/ /g, " ")).toBe("R$ 10,00 por dia");
  });
});

describe("validateExternalReserved", () => {
  it("accepts integers from 0 to 12", () => {
    expect(validateExternalReserved("0")).toMatchObject({ ok: true, value: 0 });
    expect(validateExternalReserved("12")).toMatchObject({
      ok: true,
      value: 12,
    });
  });

  it("rejects out of range, negative, fractional and empty", () => {
    for (const bad of ["13", "-1", "1.5", ""]) {
      expect(validateExternalReserved(bad).ok).toBe(false);
    }
  });
});

describe("validateProfileHash", () => {
  it("accepts 64 hex characters, trims and lowercases", () => {
    const result = validateProfileHash(`  ${"AB".repeat(32)}  `);
    expect(result).toMatchObject({ ok: true, value: "ab".repeat(32) });
  });

  it("rejects wrong length and non-hex input", () => {
    for (const bad of ["", "a".repeat(63), "a".repeat(65), "g".repeat(64)]) {
      expect(validateProfileHash(bad).ok).toBe(false);
    }
  });
});

describe("canActivate", () => {
  it("allows a draft global Vertex account", () => {
    expect(canActivate(account())).toEqual({ ok: true, reason: "" });
  });

  it("explains why a non-draft account cannot be activated", () => {
    const result = canActivate(account({ status: "active" }));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("rascunho");
  });

  it("only allows Vertex service accounts", () => {
    const result = canActivate(account({ kind: "openai_api_key" }));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Vertex");
  });

  it("only allows the global location", () => {
    const result = canActivate(account({ location: "us-central1" }));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("global");
  });
});

describe("activationBody", () => {
  it("sends the measured profile hash the operator provided", () => {
    expect(
      activationBody(account(), 2, "ativar conta aprovada", "c".repeat(64)),
    ).toEqual({
      expected_version: 3,
      model: "gemini-3.5-flash-lite",
      expected_profile_sha256: "c".repeat(64),
      external_reserved: 2,
      reason: "ativar conta aprovada",
    });
  });
});

describe("isVersionConflict", () => {
  it("is true only for a 409 api error", () => {
    expect(isVersionConflict(new ApiError(409, "X", "conflito"))).toBe(true);
    expect(isVersionConflict(new ApiError(422, "X", "inválido"))).toBe(false);
    expect(isVersionConflict(new Error("x"))).toBe(false);
  });
});

describe("shortHash", () => {
  it("shortens to 12 characters plus an ellipsis", () => {
    expect(shortHash("a".repeat(64))).toBe(`${"a".repeat(12)}…`);
  });

  it("shows a dash when there is no hash", () => {
    expect(shortHash(null)).toBe("—");
  });
});
