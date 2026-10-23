import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteTeamApplication } from "./api";
import { deletionBlockMessage } from "./application-deletion";
import { ApiError } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("deleteTeamApplication", () => {
  it("sends the reason in the body with CSRF, never in the URL", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        application_id: "a/1",
        status: "deleted",
        audit_event_id: "e1",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await deleteTeamApplication(
      "a/1",
      "Aplicação substituída por outra.",
      "csrf-x",
    );
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(new URL(url, "http://x").pathname).toBe(
      "/v1/team/applications/a%2F1",
    );
    expect(init.method).toBe("DELETE");
    expect((init.headers as Record<string, string>)["X-CSRF-Token"]).toBe(
      "csrf-x",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      reason: "Aplicação substituída por outra.",
    });
    expect(url).not.toContain("substitu");
    expect(result).toEqual({
      application_id: "a/1",
      status: "deleted",
      audit_event_id: "e1",
    });
  });
});

describe("deletionBlockMessage", () => {
  it("explains a repeated deletion", () => {
    const cause = new ApiError(
      409,
      "integration.application_deletion_conflict",
      "x",
    );
    expect(deletionBlockMessage(cause)).toMatch(/já foi excluída/);
  });
  it("explains a missing application", () => {
    expect(deletionBlockMessage(new ApiError(404, "x", "x"))).toMatch(
      /não existe mais/,
    );
  });
  it("explains insufficient role", () => {
    expect(deletionBlockMessage(new ApiError(403, "x", "x"))).toMatch(
      /administrador/,
    );
  });
  it("falls back to the server detail", () => {
    expect(
      deletionBlockMessage(new ApiError(422, "x", "Motivo inválido.")),
    ).toBe("Motivo inválido.");
  });
});
