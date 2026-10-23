import { describe, expect, it } from "vitest";
import type {
  PartnerCredential,
  WebhookDelivery,
  WebhookEndpoint,
} from "./api";
import {
  summarizeCredentials,
  summarizeDeliveries,
  summarizeDelivery,
  summarizeEndpoint,
  webhookHost,
} from "./application-overview-model";

const endpoint = (
  overrides: Partial<WebhookEndpoint> = {},
): WebhookEndpoint => ({
  id: "e1",
  application_id: "a1",
  url: "https://hooks.exemplo.com.br/aferis?token=segredo",
  status: "active",
  created_at: "2026-10-01T00:00:00Z",
  plain_secret: null,
  last_successful_test_at: null,
  ...overrides,
});

const credential = (
  overrides: Partial<PartnerCredential> = {},
): PartnerCredential => ({
  id: "c1",
  client_id: "cli_1",
  status: "active",
  created_at: "2026-10-01T00:00:00Z",
  revoked_at: null,
  issue_request_id: null,
  ...overrides,
});

const delivery = (
  overrides: Partial<WebhookDelivery> = {},
): WebhookDelivery => ({
  id: "d1",
  event_type: "analysis.completed",
  status: "delivered",
  endpoint_url: "https://hooks.exemplo.com.br/aferis",
  http_status: 200,
  duration_ms: 120,
  created_at: "2026-10-20T10:00:00Z",
  attempted_at: "2026-10-20T10:00:01Z",
  is_test: false,
  ...overrides,
});

describe("webhookHost", () => {
  it("shows only the host, never the path or query", () => {
    expect(
      webhookHost("https://hooks.exemplo.com.br/aferis?token=segredo"),
    ).toBe("hooks.exemplo.com.br");
  });
  it("returns a dash for invalid addresses", () => {
    expect(webhookHost("nao é url")).toBe("—");
  });
});

describe("summarizeEndpoint", () => {
  it("explains a missing endpoint", () => {
    expect(summarizeEndpoint(null)).toEqual({
      label: "Não configurado",
      tone: "badge-neutral",
      detail: "Nenhum endereço de webhook cadastrado.",
    });
  });
  it("maps statuses and shows the host", () => {
    expect(summarizeEndpoint(endpoint())).toMatchObject({
      label: "Ativo",
      tone: "badge-success",
      detail: "hooks.exemplo.com.br",
    });
    expect(summarizeEndpoint(endpoint({ status: "draft" }))).toMatchObject({
      label: "Rascunho",
      tone: "badge-neutral",
    });
    expect(summarizeEndpoint(endpoint({ status: "suspended" }))).toMatchObject({
      label: "Suspenso",
      tone: "badge-warning",
    });
  });
});

describe("summarizeCredentials (expiry)", () => {
  it("does not count an expired credential as active", () => {
    const result = summarizeCredentials(
      [
        credential(),
        credential({ id: "c2", expires_at: "2020-01-01T00:00:00Z" }),
      ],
      Date.parse("2026-10-23T00:00:00Z"),
    );
    expect(result.active).toBe(1);
    expect(result.label).toBe("1 de 2 ativas");
  });
});

describe("summarizeCredentials", () => {
  it("counts active credentials against the limit of 2", () => {
    expect(
      summarizeCredentials([
        credential(),
        credential({ id: "c2" }),
        credential({ id: "c3", status: "revoked" }),
      ]),
    ).toEqual({
      active: 2,
      revoked: 1,
      tone: "badge-success",
      label: "2 de 2 ativas",
    });
  });
  it("warns when none is active", () => {
    expect(summarizeCredentials([])).toEqual({
      active: 0,
      revoked: 0,
      tone: "badge-warning",
      label: "Nenhuma ativa",
    });
  });
});

describe("summarizeDelivery", () => {
  it("handles no deliveries", () => {
    expect(summarizeDelivery(null)).toEqual({
      label: "Nenhuma entrega",
      tone: "badge-neutral",
      at: null,
    });
  });
  it("maps delivery statuses", () => {
    expect(summarizeDelivery(delivery())).toMatchObject({
      label: "Entregue",
      tone: "badge-success",
      at: "2026-10-20T10:00:00Z",
    });
    expect(summarizeDelivery(delivery({ status: "attempted" }))).toMatchObject({
      label: "Tentativa sem sucesso",
      tone: "badge-warning",
    });
    expect(summarizeDelivery(delivery({ status: "unknown" }))).toMatchObject({
      label: "Em conferência",
      tone: "badge-warning",
    });
    expect(summarizeDelivery(delivery({ status: "pending" }))).toMatchObject({
      label: "Pendente",
      tone: "badge-info",
    });
    expect(summarizeDelivery(delivery({ status: "skipped" }))).toMatchObject({
      label: "Não enviada",
      tone: "badge-neutral",
    });
  });
});

describe("summarizeDeliveries", () => {
  it("is empty without deliveries", () => {
    expect(summarizeDeliveries([])).toEqual({
      total: 0,
      delivered: 0,
      problems: 0,
      successRate: null,
      averageMs: null,
    });
  });
  it("computes the rate and the average duration over real deliveries", () => {
    const items = [
      delivery({ id: "1", duration_ms: 100 }),
      delivery({ id: "2", duration_ms: 300 }),
      delivery({ id: "3", status: "attempted", duration_ms: 600 }),
      delivery({ id: "4", status: "pending", duration_ms: null }),
    ];
    expect(summarizeDeliveries(items)).toEqual({
      total: 4,
      delivered: 2,
      problems: 1,
      successRate: 2 / 3,
      averageMs: 333,
    });
  });
  it("ignores pending and skipped for the rate", () => {
    expect(
      summarizeDeliveries([
        delivery({ status: "pending" }),
        delivery({ status: "skipped" }),
      ]).successRate,
    ).toBeNull();
  });
});
