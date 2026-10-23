import { afterEach, describe, expect, it, vi } from "vitest";
import { ownerPeopleApi, teamPeopleApi } from "./api";

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  const fetchMock = vi.fn(async () =>
    Response.json({ items: [], next_cursor: null }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastCall(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [
    string,
    RequestInit,
  ];
  return {
    path: new URL(url, "http://x").pathname + new URL(url, "http://x").search,
    method: init.method,
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
}

describe("ownerPeopleApi", () => {
  it("reads only the session organization, with no organization id in the path", async () => {
    const fetchMock = stubFetch();
    await ownerPeopleApi("csrf-1").list("c1");
    expect(lastCall(fetchMock)).toMatchObject({
      path: "/v1/partner/people?limit=20&cursor=c1",
      method: "GET",
    });
    await ownerPeopleApi("csrf-1").events("m 1");
    expect(lastCall(fetchMock).path).toBe(
      "/v1/partner/people/m%201/events?limit=20",
    );
  });

  it("invites with role and a default reason, sending CSRF", async () => {
    const fetchMock = stubFetch();
    await ownerPeopleApi("csrf-1").invite("a@b.com", "developer");
    const call = lastCall(fetchMock);
    expect(call).toMatchObject({
      path: "/v1/partner/invitations",
      method: "POST",
      headers: { "X-CSRF-Token": "csrf-1" },
    });
    expect(call.body).toMatchObject({ email: "a@b.com", role: "developer" });
    expect(call.body.reason.length).toBeGreaterThanOrEqual(3);
  });

  it("changes role, suspends and revokes with the reason in the body", async () => {
    const fetchMock = stubFetch();
    const api = ownerPeopleApi("csrf-1");
    await api.changeRole("m1", "financial_reader", "Extrato");
    expect(lastCall(fetchMock)).toMatchObject({
      path: "/v1/partner/people/m1/role",
      method: "PUT",
      body: { role: "financial_reader", reason: "Extrato" },
    });
    await api.suspend("m1", "Saiu");
    expect(lastCall(fetchMock)).toMatchObject({
      path: "/v1/partner/people/m1/suspend",
      method: "POST",
      body: { reason: "Saiu" },
    });
    await api.revoke("i1", "Engano");
    expect(lastCall(fetchMock)).toMatchObject({
      path: "/v1/partner/invitations/i1/revoke",
      body: { reason: "Engano" },
    });
  });
});

describe("teamPeopleApi", () => {
  it("scopes by organization and sends the role on invitation and change", async () => {
    const fetchMock = stubFetch();
    const api = teamPeopleApi("o1", "csrf-2");
    await api.invite("a@b.com", "owner");
    expect(lastCall(fetchMock)).toMatchObject({
      path: "/v1/team/organizations/o1/partner-invitations",
      body: { email: "a@b.com", role: "owner" },
    });
    await api.changeRole("m1", "developer", "Responsável técnico");
    expect(lastCall(fetchMock)).toMatchObject({
      path: "/v1/team/organizations/o1/partner-people/m1/role",
      method: "PUT",
      headers: { "X-CSRF-Token": "csrf-2" },
      body: { role: "developer", reason: "Responsável técnico" },
    });
  });
});
