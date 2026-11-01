import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginPasskeyLogin,
  beginPasskeyRegistration,
  classifyAnalysisOriginal,
  createAdditionalApplication,
  finishPasskeyLogin,
  finishPasskeyRegistration,
  getApplicationRedirectUris,
  getLatestSourceDecision,
  listAnalysisAttention,
  listAnalysisNoticeExceptions,
  listPendingSourceClassifications,
  listUncertainSubmissions,
  replaceApplicationRedirectUris,
  readSupplierEvidence,
  reconcileNoPurchase,
  reconcileAnalysisNotice,
  reconcileProtocol,
} from "./api";
import { uuidv7 } from "./uuidv7";

afterEach(() => vi.unstubAllGlobals());

describe("cliente da API interna", () => {
  it("lista avisos incertos e registra recebimento com CSRF, sem reenvio", async () => {
    const noticeId = uuidv7();
    const cursor = uuidv7();
    const fetchMock = vi.fn().mockImplementation(
      async (_url: string, init: RequestInit) =>
        new Response(
          JSON.stringify(
            init.method === "GET"
              ? { items: [], next_cursor: null }
              : {
                  id: uuidv7(),
                  notice_id: noticeId,
                  outcome: "recipient_received",
                },
          ),
          { status: init.method === "GET" ? 200 : 201 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await listAnalysisNoticeExceptions(cursor);
    await reconcileAnalysisNotice(
      noticeId,
      "smtp.sha256:0123456789",
      "Mensagem e anexo recebidos na caixa.",
      "csrf",
    );
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(new URL(calls[0][0]).pathname).toBe(
      "/v1/team/analysis-requests/notice-exceptions",
    );
    expect(new URL(calls[0][0]).searchParams.get("cursor")).toBe(cursor);
    expect(calls[0][1].credentials).toBe("include");
    expect(new URL(calls[1][0]).pathname).toBe(
      `/v1/team/analysis-requests/notice-exceptions/${noticeId}/reconciliations`,
    );
    expect(calls[1][1].method).toBe("POST");
    expect(calls[1][1].headers).toMatchObject({ "X-CSRF-Token": "csrf" });
    expect(JSON.parse(calls[1][1].body as string)).toEqual({
      evidence_ref: "smtp.sha256:0123456789",
      reason: "Mensagem e anexo recebidos na caixa.",
    });
  });
  it("usa as rotas reais de conciliação e o cursor after", async () => {
    const itemId = uuidv7();
    const cursor = uuidv7();
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ items: [], next_cursor: null }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await listUncertainSubmissions(cursor, "active");
    await readSupplierEvidence(itemId, "Conferência da compra incerta", "csrf");
    await reconcileNoPurchase(
      itemId,
      "Não consta compra no portal consultado",
      "csrf",
    );
    await reconcileProtocol(
      itemId,
      "IS-123",
      "Protocolo confirmado no portal",
      "csrf",
    );
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(new URL(calls[0][0]).searchParams.get("after")).toBe(cursor);
    expect(new URL(calls[0][0]).searchParams.get("state")).toBe("active");
    expect(calls.slice(1).map(([url]) => new URL(url).pathname)).toEqual([
      `/v1/team/registry-submissions/${itemId}/evidence`,
      `/v1/team/registry-submissions/${itemId}/reconcile/no-purchase`,
      `/v1/team/registry-submissions/${itemId}/reconcile/protocol`,
    ]);
    expect(
      calls
        .slice(1)
        .every(
          ([, init]) =>
            (init.headers as Record<string, string>)["X-CSRF-Token"] === "csrf",
        ),
    ).toBe(true);
  });
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
});
