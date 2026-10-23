import { describe, expect, it } from "vitest";
import type {
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventCatalogItem,
} from "./api";
import {
  canResend,
  eventsSummary,
  keyStage,
  selectableEvents,
  selectionChanged,
  toggleEvent,
} from "./webhook-settings-model";

const endpoint = (o: Partial<WebhookEndpoint> = {}): WebhookEndpoint => ({
  id: "e1",
  application_id: "a1",
  url: "https://x.example.com/h",
  status: "active",
  created_at: "2026-10-01T00:00:00Z",
  plain_secret: null,
  event_types: ["analysis.completed"],
  event_selection_version: 2,
  key_version: 1,
  pending_key_version: null,
  pending_key_prepared_at: null,
  pending_key_tested_at: null,
  ...o,
});

const delivery = (o: Partial<WebhookDelivery> = {}): WebhookDelivery => ({
  id: "d1",
  event_type: "analysis.completed",
  status: "attempted",
  endpoint_url: "https://x.example.com/h",
  http_status: 500,
  duration_ms: 20,
  created_at: "2026-10-23T10:00:00Z",
  attempted_at: "2026-10-23T10:00:01Z",
  is_test: false,
  ...o,
});

describe("keyStage", () => {
  it("walks none → prepared → tested", () => {
    expect(keyStage(endpoint())).toBe("none");
    expect(keyStage(endpoint({ pending_key_version: 2 }))).toBe("prepared");
    expect(
      keyStage(
        endpoint({
          pending_key_version: 2,
          pending_key_tested_at: "2026-10-23T10:00:00Z",
        }),
      ),
    ).toBe("tested");
  });
  it("treats an older backend without key fields as no rotation", () => {
    const legacy = endpoint();
    delete (legacy as Partial<WebhookEndpoint>).pending_key_version;
    expect(keyStage(legacy)).toBe("none");
  });
});

describe("event selection", () => {
  const catalog: WebhookEventCatalogItem[] = [
    {
      type: "webhook.test",
      version: 1,
      subscribable: false,
      json_schema: {},
      example: {},
    },
    {
      type: "analysis.created",
      version: 1,
      subscribable: true,
      json_schema: {},
      example: {},
    },
    {
      type: "analysis.completed",
      version: 1,
      subscribable: true,
      json_schema: {},
      example: {},
    },
  ];
  it("offers only subscribable events", () => {
    expect(selectableEvents(catalog).map((e) => e.type)).toEqual([
      "analysis.created",
      "analysis.completed",
    ]);
  });
  it("toggles keeping catalog order and detects changes", () => {
    const order = ["analysis.created", "analysis.completed"];
    expect(
      toggleEvent(["analysis.completed"], "analysis.created", order),
    ).toEqual(order);
    expect(toggleEvent(order, "analysis.created", order)).toEqual([
      "analysis.completed",
    ]);
    expect(
      selectionChanged(["analysis.completed"], ["analysis.completed"]),
    ).toBe(false);
    expect(
      selectionChanged(
        ["analysis.created", "analysis.completed"],
        ["analysis.completed", "analysis.created"],
      ),
    ).toBe(false);
    expect(selectionChanged([], ["analysis.completed"])).toBe(true);
  });
});

describe("canResend", () => {
  it("allows only real events that ended in failure or uncertainty", () => {
    expect(canResend(delivery())).toBe(true);
    expect(canResend(delivery({ status: "unknown" }))).toBe(true);
    expect(canResend(delivery({ status: "delivered" }))).toBe(false);
    expect(canResend(delivery({ status: "pending" }))).toBe(false);
    expect(canResend(delivery({ is_test: true }))).toBe(false);
  });
});

describe("eventsSummary", () => {
  it("names the selected events", () => {
    expect(eventsSummary(["analysis.created", "analysis.completed"])).toBe(
      "Análise criada, Análise concluída",
    );
    expect(eventsSummary(["analysis.completed"])).toBe("Análise concluída");
  });
  it("says deliveries are paused when nothing is selected", () => {
    expect(eventsSummary([])).toBe(
      "Nenhum evento selecionado: entregas pausadas",
    );
  });
  it("keeps the old wording for a backend that sends no selection", () => {
    expect(eventsSummary(undefined)).toBe("Análise concluída");
  });
});
