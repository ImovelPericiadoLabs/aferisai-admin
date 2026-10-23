import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  beginPasskeyLogin,
  beginPasskeyRegistration,
  classifyAnalysisOriginal,
  createAdditionalApplication,
  createOrganization,
  currentMember,
  deleteSession,
  finishPasskeyLogin,
  finishPasskeyRegistration,
  describeOrganizationPermission,
  getOrganization,
  getApplicationRedirectUris,
  getLatestSourceDecision,
  grantApplicationPermission,
  issuePartnerCredential,
  listAnalysisAttention,
  listOrganizations,
  listPendingSourceClassifications,
  listPartnerCredentials,
  mediaUrl,
  replaceOrganizationProfile,
  replaceApplicationRedirectUris,
  revokeApplicationPermission,
  revokePartnerCredential,
} from "./api";
import { uuidv7 } from "./uuidv7";

afterEach(() => vi.unstubAllGlobals());

describe("cliente da API interna", () => {
  it("mantém cookie e CSRF nas cerimônias de chave de acesso", async () => {
    const options = {
      challenge_id: uuidv7(),
      public_key: { challenge: "challenge" },
    };
    const credential = {
      id: "credential",
      response: { clientDataJSON: "payload" },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(options), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: uuidv7(), label: "Notebook" }), {
          status: 201,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(options), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ csrf_token: "csrf-new", expires_in: 28800 }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    await beginPasskeyRegistration("csrf-current");
    await finishPasskeyRegistration(
      options.challenge_id,
      credential,
      "Notebook",
      "csrf-current",
    );
    await beginPasskeyLogin("person@example.test");
    await finishPasskeyLogin(
      "person@example.test",
      options.challenge_id,
      credential,
    );
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls.map(([url]) => new URL(url).pathname)).toEqual([
      "/v1/team/passkeys/registration/options",
      "/v1/team/passkeys/registration/confirm",
      "/v1/team/passkeys/authentication/options",
      "/v1/team/passkeys/authentication/confirm",
    ]);
    expect(
      calls.every(
        ([, init]) =>
          init.credentials === "include" && init.cache === "no-store",
      ),
    ).toBe(true);
    expect(calls[0][1].headers).toMatchObject({
      "X-CSRF-Token": "csrf-current",
    });
    expect(calls[1][1].headers).toMatchObject({
      "X-CSRF-Token": "csrf-current",
    });
    expect(calls[2][1].headers).not.toHaveProperty("X-CSRF-Token");
    expect(calls[3][1].headers).not.toHaveProperty("X-CSRF-Token");
  });
  it("consulta e substitui callbacks com versão e CSRF", async () => {
    const registry = { application_id: "app", redirect_uris: [], version: 0 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(registry), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...registry,
            redirect_uris: ["https://partner.example.test/callback"],
            version: 1,
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect((await getApplicationRedirectUris("app")).version).toBe(0);
    await replaceApplicationRedirectUris(
      "app",
      ["https://partner.example.test/callback"],
      0,
      "csrf-test",
    );
    const [url, options] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(new URL(url).pathname).toBe(
      "/v1/team/applications/app/redirect-uris",
    );
    expect(options.method).toBe("PUT");
    expect(options.credentials).toBe("include");
    expect(options.headers).toMatchObject({ "X-CSRF-Token": "csrf-test" });
    expect(JSON.parse(options.body as string)).toEqual({
      redirect_uris: ["https://partner.example.test/callback"],
      expected_version: 0,
    });
  });

  it("cria aplicação adicional com UUIDv7, cookie e CSRF, sem segredo", async () => {
    const applicationId = uuidv7();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: applicationId,
          organization_id: "org-id",
          name: "Segunda",
          status: "active",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await createAdditionalApplication(
      "org-id",
      applicationId,
      "Segunda",
      "csrf-test",
    );
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe(
      `/v1/team/organizations/org-id/applications/${applicationId}`,
    );
    expect(options.method).toBe("PUT");
    expect(options.credentials).toBe("include");
    expect(options.headers).toMatchObject({ "X-CSRF-Token": "csrf-test" });
    expect(JSON.parse(options.body as string)).toEqual({ name: "Segunda" });
    expect(result).not.toHaveProperty("client_secret");
  });

  it("consulta trabalhos que exigem atenção sem iniciar uma ação", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await listAnalysisAttention("0199f6d9-3e75-7c71-9e2a-f74fd4ef60a1");
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/v1/team/analysis-works/attention");
    expect(parsed.searchParams.get("limit")).toBe("20");
    expect(parsed.searchParams.get("cursor")).toBe(
      "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a1",
    );
    expect(options.method).toBe("GET");
    expect(options.credentials).toBe("include");
    expect(options.headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("consulta a fila pré-cobrança com cursor e sem CSRF", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await listPendingSourceClassifications(
      "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a1",
    );
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe(
      "/v1/team/analysis-requests/pending-source-classifications",
    );
    expect(parsed.searchParams.get("limit")).toBe("20");
    expect(parsed.searchParams.get("cursor")).toBe(
      "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a1",
    );
    expect(options.credentials).toBe("include");
    expect(options.headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("consulta e registra a classificação anterior à cobrança com a sessão da equipe", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ decision: null }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "decision-id" }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const requestId = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a1";

    expect((await getLatestSourceDecision(requestId)).decision).toBeNull();
    expect(
      await classifyAnalysisOriginal(
        requestId,
        {
          source_kind: "registry_record",
          reason: "Conferi visualmente o documento registral.",
          supersedes_decision_id: null,
        },
        "csrf-test",
      ),
    ).toEqual({ id: "decision-id" });

    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls[0][0]).toBe(
      `http://localhost:8000/v1/team/analysis-requests/${requestId}/source-decisions/latest`,
    );
    expect(calls[0][1].headers).not.toHaveProperty("X-CSRF-Token");
    expect(calls[1][0]).toBe(
      `http://localhost:8000/v1/team/analysis-requests/${requestId}/source-decisions`,
    );
    expect(calls[1][1].credentials).toBe("include");
    expect(calls[1][1].headers).toMatchObject({
      "X-CSRF-Token": "csrf-test",
    });
    expect(JSON.parse(calls[1][1].body as string)).toEqual({
      source_kind: "registry_record",
      reason: "Conferi visualmente o documento registral.",
      supersedes_decision_id: null,
    });
  });

  it("gera identificador UUIDv7 para a tentativa de emissão", () => {
    const value = uuidv7();
    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("envia cookie e CSRF no cadastro sem armazenar o segredo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          organization_id: "org",
          application_id: "app",
          client_id: "client",
          client_secret: "one-time",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createOrganization(
      {
        organization_slug: "parceiro",
        organization_name: "Parceiro",
        application_name: "API",
      },
      "csrf-test",
    );

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/v1/team/organizations");
    expect(options.credentials).toBe("include");
    expect(options.cache).toBe("no-store");
    expect(options.headers).toMatchObject({ "X-CSRF-Token": "csrf-test" });
    expect(result.client_secret).toBe("one-time");
  });

  it("não envia CSRF para a leitura da sessão e distingue o papel retornado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "member",
          email: "equipe@example.com",
          role: "viewer",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const member = await currentMember();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("GET");
    expect(options.headers).not.toHaveProperty("X-CSRF-Token");
    expect(member.role).toBe("viewer");
  });

  it("lê apenas a mensagem pública do contrato de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 403,
            code: "team.csrf_invalid",
            detail: "Confirmação inválida.",
            internal: "hidden",
          }),
          { status: 403 },
        ),
      ),
    );

    await expect(deleteSession("invalid")).rejects.toMatchObject({
      status: 403,
      code: "team.csrf_invalid",
      detail: "Confirmação inválida.",
    } satisfies Partial<ApiError>);
  });

  it("aceita saída sem corpo de resposta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(deleteSession("csrf-test")).resolves.toBeUndefined();
  });

  it("busca organizações com filtro e cursor sem enviar CSRF", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await listOrganizations("  cartório  ", "cursor-opaco");
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/v1/team/organizations");
    expect(parsed.searchParams.get("q")).toBe("cartório");
    expect(parsed.searchParams.get("cursor")).toBe("cursor-opaco");
    expect(parsed.searchParams.get("limit")).toBe("20");
    expect(options.credentials).toBe("include");
    expect(options.headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("consulta detalhe por ID sem credencial de parceiro ou CSRF", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ id: "org", applications: [], permissions: [] }),
            { status: 200 },
          ),
      );
    vi.stubGlobal("fetch", fetchMock);
    await getOrganization("0199f6d9-3e75-7c71-9e2a-f74fd4ef60a0");
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://localhost:8000/v1/team/organizations/0199f6d9-3e75-7c71-9e2a-f74fd4ef60a0",
    );
    expect(options.credentials).toBe("include");
    expect(options.headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("aceita somente logo relativo à origem da API", () => {
    expect(mediaUrl("/media/organizations/logo.webp")).toBe(
      "http://localhost:8000/media/organizations/logo.webp",
    );
    expect(mediaUrl("https://fornecedor.example/logo.webp")).toBeNull();
    expect(mediaUrl("//fornecedor.example/logo.webp")).toBeNull();
    expect(mediaUrl(null)).toBeNull();
  });

  it("salva perfil com CSRF e sem alterar o slug", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "org",
          slug: "parceiro",
          name: "Parceiro",
          description: "Descrição",
          status: "active",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await replaceOrganizationProfile(
      "org",
      { name: "Parceiro", description: "Descrição" },
      "csrf-test",
    );
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/v1/team/organizations/org/profile");
    expect(options.method).toBe("PUT");
    expect(options.credentials).toBe("include");
    expect(options.headers).toMatchObject({ "X-CSRF-Token": "csrf-test" });
    expect(JSON.parse(options.body as string)).toEqual({
      name: "Parceiro",
      description: "Descrição",
    });
  });

  it("edita descrição e muda concessão somente por código do contrato", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            code: "application:read",
            description: "Consultar aplicação",
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await describeOrganizationPermission(
      "org",
      "application:read",
      "Consultar aplicação",
      "csrf-test",
    );
    await grantApplicationPermission("app", "application:read", "csrf-test");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await revokeApplicationPermission("app", "application:read", "csrf-test");
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls[0][0]).toContain(
      "/organizations/org/permissions/application%3Aread",
    );
    expect(calls[0][1].method).toBe("PUT");
    expect(JSON.parse(calls[0][1].body as string)).toEqual({
      description: "Consultar aplicação",
    });
    expect(calls[1][0]).toContain(
      "/applications/app/permissions/application%3Aread",
    );
    expect(calls[1][1].method).toBe("PUT");
    expect(calls[2][1].method).toBe("DELETE");
    for (const [, options] of calls)
      expect(options.headers).toMatchObject({ "X-CSRF-Token": "csrf-test" });
  });

  it("lista metadados e emite uma credencial com chave UUIDv7 e CSRF", async () => {
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
            id: "credential",
            client_id: "client",
            client_secret: "once",
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const key = "0199f6d9-3e75-7c71-9e2a-f74fd4ef60a0";
    await listPartnerCredentials("app");
    const issued = await issuePartnerCredential("app", key, "csrf-test", {
      name: "Sistema de produção",
      expires_in_days: 90,
      scopes: ["application:read"],
    });
    await revokePartnerCredential("app", "credential", "csrf-test");

    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls[0][0]).toContain("/applications/app/credentials?limit=20");
    expect(calls[0][1].headers).not.toHaveProperty("X-CSRF-Token");
    expect(calls[1][1].method).toBe("POST");
    expect(calls[1][1].headers).toMatchObject({
      "Idempotency-Key": key,
      "X-CSRF-Token": "csrf-test",
    });
    expect(issued.client_secret).toBe("once");
    expect(JSON.parse(String(calls[1][1].body))).toEqual({
      name: "Sistema de produção",
      expires_in_days: 90,
      scopes: ["application:read"],
    });
    expect(calls[2][0]).toContain("/applications/app/credentials/credential");
    expect(calls[2][1].method).toBe("DELETE");
    expect(calls[2][1].headers).toMatchObject({ "X-CSRF-Token": "csrf-test" });
    for (const [, options] of calls) {
      expect(options.credentials).toBe("include");
      expect(options.cache).toBe("no-store");
    }
  });
});
