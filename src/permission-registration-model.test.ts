import { describe, expect, it } from "vitest";
import {
  registrableCodes,
  registrationErrorMessage,
} from "./permission-registration-model";

describe("registrableCodes", () => {
  it("offers implemented codes that the organization does not have yet", () => {
    const codes = registrableCodes(["application:read", "analysis:read"]).map(
      (item) => item.code,
    );
    expect(codes).toEqual([
      "analysis:submit:upload",
      "registry:submit",
      "registry:read",
      "events:analysis",
    ]);
  });
  it("is empty when everything implemented is already registered", () => {
    expect(
      registrableCodes([
        "application:read",
        "analysis:read",
        "analysis:submit:upload",
        "events:analysis",
        "registry:submit",
        "registry:read",
      ]),
    ).toEqual([]);
  });
  it("carries the title and a default description for each code", () => {
    const [first] = registrableCodes([]);
    expect(first.title.length).toBeGreaterThan(3);
    expect(first.description.length).toBeGreaterThan(10);
  });
});

describe("registrationErrorMessage", () => {
  it("explains the conflict and the unsupported code", () => {
    expect(registrationErrorMessage(409, "x")).toBe(
      "Esta ação já está cadastrada. Atualize a tela.",
    );
    expect(
      registrationErrorMessage(422, "Permission has no implemented operation"),
    ).toMatch(/ainda não protege/);
    expect(registrationErrorMessage(403, "x")).toMatch(
      /gestor ou administrador/,
    );
    expect(registrationErrorMessage(500, "Falha técnica")).toBe(
      "Falha técnica",
    );
  });
});
