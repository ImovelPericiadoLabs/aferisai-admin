import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activateWebhookKey,
  listWebhookEventCatalog,
  prepareWebhookKey,
  resendWebhookDelivery,
  selectWebhookEvents,
  testApplicationWebhookEndpoint,
  testWebhookKey,
} from "./api";

afterEach(() => vi.unstubAllGlobals());

function stub() {
  const fetchMock = vi.fn(async () => Response.json({}));
  vi.stubGlobal("fetch", fetchMock);
  return () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [
      string,
      RequestInit,
    ];
    return {
      path: new URL(url, "http://x").pathname,
      method: init.method,
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
  };
}

describe("webhook settings API", () => {
  it("reads the catalog per channel", async () => {
    const last = stub();
    await listWebhookEventCatalog("partner");
    expect(last()).toMatchObject({
      path: "/v1/partner/webhook-events",
      method: "GET",
    });
  });

  it("selects events with the expected version, CSRF and reason header", async () => {
    const last = stub();
    await selectWebhookEvents(
      "a1",
      ["analysis.created"],
      4,
      "csrf",
      "team",
      "Só criação",
    );
    expect(last()).toMatchObject({
      path: "/v1/team/applications/a1/webhook-endpoint/events",
      method: "PUT",
      headers: { "X-CSRF-Token": "csrf" },
      body: { event_types: ["analysis.created"], expected_version: 4 },
    });
    expect(last().headers["X-Change-Reason"]).toBeTruthy();
  });

  it("walks the three key rotation steps", async () => {
    const last = stub();
    await prepareWebhookKey("a1", "csrf", "partner");
    expect(last()).toMatchObject({
      path: "/v1/partner/applications/a1/webhook-endpoint/key-rotation",
      method: "POST",
    });
    await testWebhookKey("a1", "csrf");
    expect(last().path).toBe(
      "/v1/team/applications/a1/webhook-endpoint/key-rotation/test",
    );
    await activateWebhookKey("a1", "csrf", "team", "Rotina trimestral");
    expect(last().path).toBe(
      "/v1/team/applications/a1/webhook-endpoint/key-rotation/activate",
    );
    expect(last().headers["X-Change-Reason"]).toBeTruthy();
  });

  it("resends with a trimmed reason and simulates a catalog event", async () => {
    const last = stub();
    await resendWebhookDelivery("a1", "d1", "  Destino voltou ao ar  ", "csrf");
    expect(last()).toMatchObject({
      path: "/v1/team/applications/a1/webhook-deliveries/d1/resend",
      body: { reason: "Destino voltou ao ar" },
    });
    await testApplicationWebhookEndpoint(
      "a1",
      "csrf",
      "team",
      "analysis.created",
    );
    expect(last()).toMatchObject({
      path: "/v1/team/applications/a1/webhook-endpoint/test",
      body: { event_type: "analysis.created" },
    });
    await testApplicationWebhookEndpoint("a1", "csrf");
    expect(last().body).toBeUndefined();
  });
});

import { getPartnerCommissions, getPartnerMetrics } from "./api";

describe("partner metrics and statement API", () => {
  it("reads organization and application metrics over a window", async () => {
    const last = stub();
    await getPartnerMetrics(7);
    expect(last()).toMatchObject({
      path: "/v1/partner/metrics",
      method: "GET",
    });
    await getPartnerMetrics(90, "a 1");
    expect(last().path).toBe("/v1/partner/applications/a%201/metrics");
  });
  it("pages the statement with cursor and no CSRF", async () => {
    const last = stub();
    await getPartnerCommissions("c1");
    expect(last().path).toBe("/v1/partner/commissions");
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain(
      "cursor=c1",
    );
    expect(last().headers["X-CSRF-Token"]).toBeUndefined();
  });
});

import {
  activateRegistrySupplierAccount,
  createRegistrySupplierAccount,
  listRegistrySupplierAccounts,
  suspendRegistrySupplierAccount,
} from "./api";

describe("registry supplier accounts API", () => {
  it("lists with a cursor and no CSRF", async () => {
    const last = stub();
    await listRegistrySupplierAccounts("c1");
    expect(last().path).toBe("/v1/team/registry-supplier-accounts");
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain(
      "cursor=c1",
    );
    expect(last().method).toBe("GET");
  });
  it("creates with CSRF and the secrets only in the JSON body, never in the URL", async () => {
    const last = stub();
    await createRegistrySupplierAccount(
      {
        label: "RI Digital",
        provider: "infosimples",
        email: "op@x.com",
        password: "segredo-1",
        token: "tk-9",
        portal_account_sha256: null,
        reason: "Reutiliza a conta do Imovel.",
      },
      "csrf",
    );
    const call = last();
    expect(call).toMatchObject({
      method: "POST",
      headers: { "X-CSRF-Token": "csrf" },
    });
    expect(call.body).toMatchObject({ password: "segredo-1", token: "tk-9" });
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).not.toMatch(
      /segredo|tk-9/,
    );
  });
  it("decides with the expected version and a reason", async () => {
    const last = stub();
    await activateRegistrySupplierAccount(
      "a1",
      3,
      "Conferida a integridade.",
      "csrf",
    );
    expect(last()).toMatchObject({
      path: "/v1/team/registry-supplier-accounts/a1/activate",
      method: "POST",
      body: { expected_version: 3, reason: "Conferida a integridade." },
    });
    await suspendRegistrySupplierAccount("a1", 4, "Troca de conta.", "csrf");
    expect(last().path).toBe("/v1/team/registry-supplier-accounts/a1/suspend");
  });
});
