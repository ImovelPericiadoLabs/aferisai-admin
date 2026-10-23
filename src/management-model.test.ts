import { describe, expect, it } from "vitest";
import {
  TEAM_ROLE_OPTIONS,
  eventActorLabel,
  eventLabel,
  eventValueLabel,
  memberBlocks,
  statusCopy,
  validateCnpj,
  validateManagementReason,
} from "./management-model";

describe("validateCnpj", () => {
  it("accepts numeric and alphanumeric CNPJs, with or without punctuation, like the backend", () => {
    expect(validateCnpj("11.222.333/0001-81")).toEqual({
      ok: true,
      normalized: "11222333000181",
    });
    expect(validateCnpj(" 11222333000181 ")).toEqual({
      ok: true,
      normalized: "11222333000181",
    });
    expect(validateCnpj("12.abc.345/01de-35")).toEqual({
      ok: true,
      normalized: "12ABC34501DE35",
    });
  });
  it("rejects wrong length, check digits, repeated characters and letters in the check digits", () => {
    for (const bad of [
      "11.222.333/0001-82",
      "11111111111111",
      "1122233300018",
      "12ABC34501DEXX",
      "",
    ]) {
      const result = validateCnpj(bad);
      expect(result.ok).toBe(false);
      expect("message" in result && result.message.length).toBeGreaterThan(5);
    }
  });
});

describe("validateManagementReason", () => {
  it("needs 5 to 500 useful characters (the backend limits for these actions)", () => {
    expect(validateManagementReason("abcd").ok).toBe(false);
    expect(validateManagementReason("  abcde  ").ok).toBe(true);
    expect(validateManagementReason("a".repeat(501)).ok).toBe(false);
  });
});

describe("memberBlocks", () => {
  const member = { id: "m1", role: "manager", status: "active" } as const;
  it("lets an administrator act on another member", () => {
    expect(memberBlocks(member, "admin-1")).toEqual({
      role: null,
      status: null,
    });
  });
  it("blocks acting on yourself, with the reason", () => {
    const own = memberBlocks({ ...member, id: "admin-1" }, "admin-1");
    expect(own.role).toMatch(/próprio papel/);
    expect(own.status).toMatch(/própria conta/);
  });
});

describe("events", () => {
  it("labels every action the backend records", () => {
    expect(eventLabel("invited")).toBe("Convite enviado");
    expect(eventLabel("activated")).toBe("Acesso ativado");
    expect(eventLabel("role_changed")).toBe("Papel alterado");
    expect(eventLabel("suspended")).toBe("Suspensão");
    expect(eventLabel("reactivated")).toBe("Reativação");
    expect(eventLabel("cnpj_changed")).toBe("CNPJ alterado");
    expect(eventLabel("outra")).toBe("Evento registrado");
  });
  it("translates role and status values, keeping masked CNPJ as is", () => {
    expect(eventValueLabel("role_changed", "financial")).toBe("Financeiro");
    expect(eventValueLabel("invited", "viewer")).toBe("Consulta");
    expect(eventValueLabel("suspended", "active")).toBe("Ativo");
    expect(eventValueLabel("cnpj_changed", "**.***.***/0001-81")).toBe(
      "**.***.***/0001-81",
    );
    expect(eventValueLabel("suspended", null)).toBe("—");
  });
  it("names the actor from a known member or falls back to the team", () => {
    const names = new Map([["t1", "ana@aferis.ai"]]);
    expect(eventActorLabel("t1", names)).toBe("ana@aferis.ai");
    expect(eventActorLabel("t9", names)).toBe("Equipe Aferis");
    expect(eventActorLabel("t1", undefined)).toBe("Equipe Aferis");
  });
});

describe("copy and options", () => {
  it("explains what suspending does for each kind of record", () => {
    expect(statusCopy("organization", "suspended").description).toMatch(
      /operações parceiras/,
    );
    expect(statusCopy("user", "suspended").description).toMatch(/sessões/);
    expect(statusCopy("team", "suspended").description).toMatch(/sessões/);
    expect(statusCopy("team", "active").confirm).toBe("Reativar acesso");
  });
  it("offers the four team roles", () => {
    expect(TEAM_ROLE_OPTIONS.map((o) => o.value)).toEqual([
      "administrator",
      "manager",
      "financial",
      "viewer",
    ]);
  });
});
