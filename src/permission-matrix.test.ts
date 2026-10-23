import { describe, expect, it } from "vitest";
import { buildPermissionMatrix } from "./permission-matrix";

const catalog = [
  { code: "application:read", description: "Ler" },
  { code: "analysis:read", description: "Consultar" },
  { code: "analysis:submit:upload", description: "Enviar" },
];

const apps = [
  {
    id: "a1",
    name: "App 1",
    status: "active",
    permissions: ["application:read", "analysis:read"],
  },
  { id: "a2", name: "App 2", status: "active", permissions: [] },
];

describe("buildPermissionMatrix", () => {
  it("keeps the catalog order and marks what each application holds", () => {
    const matrix = buildPermissionMatrix({
      status: "active",
      applications: apps,
      permissions: catalog,
    });
    expect(matrix.codes.map((c) => c.code)).toEqual(catalog.map((c) => c.code));
    expect(matrix.rows[0].granted).toEqual({
      "application:read": true,
      "analysis:read": true,
      "analysis:submit:upload": false,
    });
    expect(matrix.rows[1].granted["application:read"]).toBe(false);
  });

  it("is editable when organization and application are active", () => {
    const row = buildPermissionMatrix({
      status: "active",
      applications: apps,
      permissions: catalog,
    }).rows[0];
    expect(row.editable).toBe(true);
    expect(row.lockedReason).toBeNull();
  });

  it("locks every row when the organization is suspended", () => {
    const rows = buildPermissionMatrix({
      status: "suspended",
      applications: apps,
      permissions: catalog,
    }).rows;
    expect(rows.every((row) => !row.editable)).toBe(true);
    expect(rows[0].lockedReason).toBe("A organização está suspensa.");
  });

  it("locks only the suspended application in an active organization", () => {
    const rows = buildPermissionMatrix({
      status: "active",
      applications: [apps[0], { ...apps[1], status: "suspended" }],
      permissions: catalog,
    }).rows;
    expect(rows[0].editable).toBe(true);
    expect(rows[1].editable).toBe(false);
    expect(rows[1].lockedReason).toBe("A aplicação está suspensa.");
  });

  it("prefers the organization reason when both are suspended", () => {
    const rows = buildPermissionMatrix({
      status: "suspended",
      applications: [{ ...apps[0], status: "suspended" }],
      permissions: catalog,
    }).rows;
    expect(rows[0].lockedReason).toBe("A organização está suspensa.");
  });
});
