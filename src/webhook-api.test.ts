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
    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
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
    expect(last()).toMatchObject({ path: "/v1/partner/webhook-events", method: "GET" });
  });

  it("selects events with the expected version, CSRF and reason header", async () => {
    const last = stub();
    await selectWebhookEvents("a1", ["analysis.created"], 4, "csrf", "team", "Só criação");
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
    expect(last().path).toBe("/v1/team/applications/a1/webhook-endpoint/key-rotation/test");
    await activateWebhookKey("a1", "csrf", "team", "Rotina trimestral");
    expect(last().path).toBe("/v1/team/applications/a1/webhook-endpoint/key-rotation/activate");
    expect(last().headers["X-Change-Reason"]).toBeTruthy();
  });

  it("resends with a trimmed reason and simulates a catalog event", async () => {
    const last = stub();
    await resendWebhookDelivery("a1", "d1", "  Destino voltou ao ar  ", "csrf");
    expect(last()).toMatchObject({
      path: "/v1/team/applications/a1/webhook-deliveries/d1/resend",
      body: { reason: "Destino voltou ao ar" },
    });
    await testApplicationWebhookEndpoint("a1", "csrf", "team", "analysis.created");
    expect(last()).toMatchObject({
      path: "/v1/team/applications/a1/webhook-endpoint/test",
      body: { event_type: "analysis.created" },
    });
    await testApplicationWebhookEndpoint("a1", "csrf");
    expect(last().body).toBeUndefined();
  });
});
