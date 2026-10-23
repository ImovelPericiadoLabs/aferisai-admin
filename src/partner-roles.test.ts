import { describe, expect, it } from "vitest";
import {
  ROLE_OPTIONS,
  memberAccess,
  roleAccess,
  roleLabel,
} from "./partner-roles";

describe("roleLabel", () => {
  it("names the three roles and tolerates unknown values", () => {
    expect(roleLabel("owner")).toBe("Proprietário");
    expect(roleLabel("developer")).toBe("Desenvolvedor");
    expect(roleLabel("financial_reader")).toBe("Financeiro (leitura)");
    expect(roleLabel("auditor")).toBe("auditor");
    expect(roleLabel(null)).toBe("—");
  });
});

describe("ROLE_OPTIONS", () => {
  it("lists the roles in privilege order with a summary each", () => {
    expect(ROLE_OPTIONS.map((o) => o.value)).toEqual([
      "owner",
      "developer",
      "financial_reader",
    ]);
    for (const option of ROLE_OPTIONS)
      expect(option.summary.length).toBeGreaterThan(10);
  });
});

describe("roleAccess", () => {
  it("follows the backend matrix", () => {
    expect(roleAccess("owner")).toEqual({
      integrations: true,
      metrics: true,
      statement: true,
      people: true,
    });
    expect(roleAccess("developer")).toEqual({
      integrations: true,
      metrics: true,
      statement: false,
      people: false,
    });
    expect(roleAccess("financial_reader")).toEqual({
      integrations: false,
      metrics: true,
      statement: true,
      people: false,
    });
  });
  it("denies everything when the role is unknown or missing", () => {
    const none = {
      integrations: false,
      metrics: false,
      statement: false,
      people: false,
    };
    expect(roleAccess(null)).toEqual(none);
    expect(roleAccess(undefined)).toEqual(none);
    expect(roleAccess("auditor")).toEqual(none);
  });
});

describe("memberAccess", () => {
  it("keeps integrations for a backend that does not send the role yet", () => {
    expect(memberAccess(undefined)).toEqual({
      integrations: true,
      metrics: false,
      statement: false,
      people: false,
    });
  });
  it("denies when the session reports no available role", () => {
    expect(memberAccess(null)).toEqual(roleAccess(null));
  });
  it("uses the matrix when the role is present", () => {
    expect(memberAccess("financial_reader")).toEqual(
      roleAccess("financial_reader"),
    );
  });
});
