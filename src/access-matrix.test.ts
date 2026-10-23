import { describe, expect, it } from "vitest";
import {
  CAPABILITIES,
  ROLES,
  canEditApplicationPermissions,
  capabilitiesFor,
  groupByArea,
} from "./access-matrix";

const labels = (role: Parameters<typeof capabilitiesFor>[0]) =>
  capabilitiesFor(role).map((item) => item.label);

describe("CAPABILITIES", () => {
  it("lists the four roles in hierarchy order, financial last", () => {
    expect(ROLES).toEqual(["viewer", "manager", "administrator", "financial"]);
  });

  it("has unique ids and at least one role per capability", () => {
    const ids = CAPABILITIES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of CAPABILITIES) {
      expect(item.roles.length).toBeGreaterThan(0);
      for (const role of item.roles) expect(ROLES).toContain(role);
    }
  });

  it("gives every role its own passkeys and session", () => {
    const own = CAPABILITIES.find((item) => item.id === "own-passkeys");
    expect(own?.roles).toEqual(ROLES);
  });
});

describe("capabilitiesFor", () => {
  it("keeps provider accounts for administrators only", () => {
    const provider = (role: Parameters<typeof capabilitiesFor>[0]) =>
      capabilitiesFor(role).some((item) => item.id === "provider-accounts");
    expect(provider("administrator")).toBe(true);
    expect(provider("manager")).toBe(false);
    expect(provider("viewer")).toBe(false);
    expect(provider("financial")).toBe(false);
  });

  it("lets only financial confirm and execute refunds", () => {
    const confirm = (role: Parameters<typeof capabilitiesFor>[0]) =>
      capabilitiesFor(role).some((item) => item.id === "exception-confirm");
    expect(confirm("financial")).toBe(true);
    expect(confirm("administrator")).toBe(false);
    expect(confirm("manager")).toBe(false);
  });

  it("lets viewer see organizations but not the integration internals", () => {
    const has = (role: Parameters<typeof capabilitiesFor>[0], id: string) =>
      capabilitiesFor(role).some((item) => item.id === id);
    expect(has("viewer", "partner-view")).toBe(true);
    expect(has("viewer", "partner-integration-view")).toBe(false);
    expect(has("manager", "partner-integration-view")).toBe(true);
    expect(has("administrator", "partner-integration-view")).toBe(true);
    expect(has("financial", "partner-integration-view")).toBe(false);
  });

  it("keeps viewer read-only on partners", () => {
    expect(labels("viewer").length).toBeGreaterThan(0);
    expect(
      capabilitiesFor("viewer").some((item) => item.id === "partner-edit"),
    ).toBe(false);
    expect(
      capabilitiesFor("viewer").some((item) => item.id === "partner-view"),
    ).toBe(true);
  });
});

describe("groupByArea", () => {
  it("keeps every capability exactly once", () => {
    const groups = groupByArea(CAPABILITIES);
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    expect(total).toBe(CAPABILITIES.length);
    expect(new Set(groups.map((group) => group.area)).size).toBe(groups.length);
  });
});

describe("canEditApplicationPermissions", () => {
  it("allows only manager and administrator", () => {
    expect(canEditApplicationPermissions("manager")).toBe(true);
    expect(canEditApplicationPermissions("administrator")).toBe(true);
    expect(canEditApplicationPermissions("viewer")).toBe(false);
    expect(canEditApplicationPermissions("financial")).toBe(false);
    expect(canEditApplicationPermissions("x")).toBe(false);
  });
});
