import {
  applicationPermissionLabel,
  labelledPermissionCodes,
} from "./display-labels";
import { describe, expect, it } from "vitest";
import {
  events,
  gaps,
  metrics,
  modes,
  permissions,
} from "./integration-catalog";

const unique = (values: string[]) => new Set(values).size === values.length;

describe("integration catalog", () => {
  it("has unique identifiers", () => {
    expect(unique(modes.map((m) => m.id))).toBe(true);
    expect(unique(permissions.map((p) => p.code))).toBe(true);
    expect(unique(events.map((e) => e.name))).toBe(true);
    expect(unique(gaps.map((g) => g.id))).toBe(true);
  });
  it("lists exactly the codes the backend supports (SUPPORTED_PERMISSION_CODES) as implemented", () => {
    expect(
      permissions
        .filter((p) => p.status === "implemented")
        .map((p) => p.code)
        .sort(),
    ).toEqual(
      [
        "analysis:read",
        "analysis:submit:upload",
        "application:read",
        "events:analysis",
        "registry:read",
        "registry:submit",
      ].sort(),
    );
  });
  it("grants only application:read by default", () => {
    expect(
      permissions.filter((p) => p.grantedByDefault).map((p) => p.code),
    ).toEqual(["application:read"]);
  });
  it("points every implemented or partial fact to a source file", () => {
    for (const entry of [...modes, ...permissions, ...events])
      if (entry.status !== "proposed") expect(entry.source).toMatch(/:\d+$/);
  });
  it("never presents a proposal as the only entry of its kind", () => {
    expect(events.some((e) => e.status === "implemented")).toBe(true);
    expect(metrics.some((m) => m.status === "implemented")).toBe(true);
  });

  it("uses the same title the permission screens show for every real code", () => {
    for (const entry of permissions.filter((p) => p.status === "implemented"))
      expect(applicationPermissionLabel(entry.code)).toBe(entry.title);
  });
  it("flags labels that exist in the admin but not in the backend", () => {
    const real = permissions
      .filter((p) => p.status === "implemented")
      .map((p) => p.code);
    const legacy = labelledPermissionCodes
      .filter((code) => !real.includes(code))
      .sort();
    // Legacy labels from the old project; remove from display-labels once no data uses them.
    expect(legacy).toEqual([
      "analysis:create",
      "analysis:write",
      "registry:create",
      "registry:write",
    ]);
  });
});
