import { afterEach, describe, expect, it, vi } from "vitest";
import {
  changeOrganizationStatus,
  changeTeamMemberRole,
  changeTeamMemberStatus,
  changeUserStatus,
  inviteTeamMember,
  listOrganizationEvents,
  listTeamMemberEvents,
  listUserEvents,
  setOrganizationCnpj,
} from "./api";

afterEach(() => vi.unstubAllGlobals());

function stub() {
  const fetchMock = vi.fn(async () =>
    Response.json({ items: [], next_cursor: null }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [
      string,
      RequestInit,
    ];
    const u = new URL(url, "http://x");
    return {
      path: u.pathname,
      search: u.search,
      method: init.method,
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
  };
}

describe("account management API", () => {
  it("changes organization state and CNPJ with PATCH/PUT, CSRF and a trimmed reason in the body", async () => {
    const last = stub();
    await changeOrganizationStatus(
      "o1",
      "suspended",
      "  Pedido do parceiro  ",
      "csrf",
    );
    expect(last()).toMatchObject({
      path: "/v1/team/organizations/o1/status",
      method: "PATCH",
      headers: { "X-CSRF-Token": "csrf" },
      body: { status: "suspended", reason: "Pedido do parceiro" },
    });
    await setOrganizationCnpj(
      "o1",
      "11222333000181",
      "Cadastro inicial",
      "csrf",
    );
    expect(last()).toMatchObject({
      path: "/v1/team/organizations/o1/cnpj",
      method: "PUT",
      body: { cnpj: "11222333000181", reason: "Cadastro inicial" },
    });
  });

  it("changes user and team member state", async () => {
    const last = stub();
    await changeUserStatus("u1", "active", "Pedido resolvido", "csrf");
    expect(last()).toMatchObject({
      path: "/v1/team/users/u1/status",
      method: "PATCH",
      body: { status: "active" },
    });
    await changeTeamMemberStatus("m1", "suspended", "Saiu da empresa", "csrf");
    expect(last().path).toBe("/v1/team/members/m1/status");
    await changeTeamMemberRole("m1", "viewer", "Mudou de função", "csrf");
    expect(last()).toMatchObject({
      path: "/v1/team/members/m1/role",
      body: { role: "viewer", reason: "Mudou de função" },
    });
  });

  it("invites a team member with email, role and reason", async () => {
    const last = stub();
    await inviteTeamMember(
      "  nova@aferis.ai ",
      "manager",
      "Reforço da operação",
      "csrf",
    );
    expect(last()).toMatchObject({
      path: "/v1/team/members/invitations",
      method: "POST",
      body: {
        email: "nova@aferis.ai",
        role: "manager",
        reason: "Reforço da operação",
      },
    });
  });

  it("reads histories by cursor, without CSRF", async () => {
    const last = stub();
    await listOrganizationEvents("o1", "c1");
    expect(last()).toMatchObject({
      path: "/v1/team/organizations/o1/events",
      method: "GET",
    });
    expect(last().search).toContain("cursor=c1");
    await listUserEvents("u1");
    expect(last().path).toBe("/v1/team/users/u1/events");
    await listTeamMemberEvents("m1");
    expect(last().path).toBe("/v1/team/members/m1/events");
    expect(last().headers?.["X-CSRF-Token"]).toBeUndefined();
  });
});
