import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acceptPartnerOrganizationInvitation,
  listPartnerOrganizations,
  switchPartnerOrganization,
} from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("contexto de empresas do parceiro", () => {
  it("lista vínculos e troca apenas a sessão atual com CSRF", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [], next_cursor: null }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "member",
            email: "partner@example.test",
            organization_id: "company-b",
            organization_name: "Empresa B",
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await listPartnerOrganizations("Empresa B");
    await switchPartnerOrganization("company-b", "csrf-current");

    const [listUrl, listOptions] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(new URL(listUrl).pathname).toBe("/v1/partner/organizations");
    expect(new URL(listUrl).searchParams.get("q")).toBe("Empresa B");
    expect(listOptions.credentials).toBe("include");
    const [switchUrl, switchOptions] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(new URL(switchUrl).pathname).toBe(
      "/v1/partner/sessions/current/organization",
    );
    expect(switchOptions.method).toBe("POST");
    expect(switchOptions.headers).toMatchObject({
      "X-CSRF-Token": "csrf-current",
    });
    expect(JSON.parse(switchOptions.body as string)).toEqual({
      organization_id: "company-b",
    });
  });

  it("aceita convite de outra empresa sem redefinir o acesso", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ organization_id: "company-b" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await acceptPartnerOrganizationInvitation(
      "invitation-token",
      "csrf-current",
    );
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe("/v1/partner/invitations/accept");
    expect(options.headers).toMatchObject({ "X-CSRF-Token": "csrf-current" });
    expect(JSON.parse(options.body as string)).toEqual({
      token: "invitation-token",
    });
  });
});
