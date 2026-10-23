import { describe, expect, it } from "vitest";
import type {
  PartnerCredential,
  WebhookDelivery,
  WebhookEndpoint,
} from "./api";
import {
  bucketDeliveries,
  filterPermissionGroups,
  groupPermissions,
  integrationReadiness,
  latencySeries,
  permissionAction,
  relativeTime,
  validateRedirectUris,
} from "./integration-insights-model";

const NOW = Date.parse("2026-10-23T15:00:00Z");

const delivery = (
  id: string,
  createdAt: string,
  overrides: Partial<WebhookDelivery> = {},
): WebhookDelivery => ({
  id,
  event_type: "analysis.completed",
  status: "delivered",
  endpoint_url: "https://h.exemplo.com/x",
  http_status: 200,
  duration_ms: 100,
  created_at: createdAt,
  attempted_at: createdAt,
  is_test: false,
  ...overrides,
});

describe("bucketDeliveries", () => {
  it("returns one bucket per day of the window, oldest first", () => {
    const buckets = bucketDeliveries([], 7, NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[6].key).toBe("2026-10-23");
    expect(buckets[0].key).toBe("2026-10-17");
    expect(buckets[6].label).toBe("23/10");
  });
  it("counts deliveries by outcome inside their day", () => {
    const buckets = bucketDeliveries(
      [
        delivery("1", "2026-10-23T12:00:00Z"),
        delivery("2", "2026-10-23T13:00:00Z", { status: "attempted" }),
        delivery("3", "2026-10-23T14:00:00Z", { status: "pending" }),
        delivery("4", "2026-10-22T12:00:00Z", { status: "unknown" }),
      ],
      7,
      NOW,
    );
    expect(buckets[6]).toMatchObject({
      delivered: 1,
      problems: 1,
      other: 1,
      total: 3,
    });
    expect(buckets[5]).toMatchObject({
      delivered: 0,
      problems: 1,
      other: 0,
      total: 1,
    });
  });
  it("uses the Sao Paulo day, not UTC", () => {
    const buckets = bucketDeliveries(
      [delivery("1", "2026-10-23T01:30:00Z")],
      3,
      NOW,
    );
    expect(buckets.find((b) => b.key === "2026-10-22")?.total).toBe(1);
  });
  it("ignores deliveries older than the window", () => {
    const buckets = bucketDeliveries(
      [delivery("1", "2026-09-01T00:00:00Z")],
      7,
      NOW,
    );
    expect(buckets.every((b) => b.total === 0)).toBe(true);
  });
});

describe("latencySeries", () => {
  it("lists timed deliveries oldest first and skips untimed ones", () => {
    const series = latencySeries(
      [
        delivery("b", "2026-10-22T10:00:00Z", { duration_ms: 300 }),
        delivery("a", "2026-10-21T10:00:00Z", { duration_ms: 100 }),
        delivery("c", "2026-10-23T10:00:00Z", { duration_ms: null }),
      ],
      30,
    );
    expect(series.map((p) => p.id)).toEqual(["a", "b"]);
    expect(series[1].ms).toBe(300);
  });
  it("keeps only the latest `limit` points", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      delivery(`d${i}`, `2026-10-2${i}T10:00:00Z`),
    );
    expect(latencySeries(items, 2).map((p) => p.id)).toEqual(["d3", "d4"]);
  });
});

describe("relativeTime", () => {
  it("speaks in minutes, hours and days", () => {
    expect(relativeTime("2026-10-23T14:59:40Z", NOW)).toBe("agora");
    expect(relativeTime("2026-10-23T14:55:00Z", NOW)).toBe("há 5 min");
    expect(relativeTime("2026-10-23T12:00:00Z", NOW)).toBe("há 3 h");
    expect(relativeTime("2026-10-20T15:00:00Z", NOW)).toBe("há 3 d");
  });
});

const endpoint = (o: Partial<WebhookEndpoint> = {}): WebhookEndpoint => ({
  id: "e",
  application_id: "a",
  url: "https://h.exemplo.com/x",
  status: "active",
  created_at: "2026-10-01T00:00:00Z",
  plain_secret: null,
  last_successful_test_at: "2026-10-02T00:00:00Z",
  ...o,
});
const credential = (o: Partial<PartnerCredential> = {}): PartnerCredential => ({
  id: "c",
  client_id: "cli",
  status: "active",
  created_at: "2026-10-01T00:00:00Z",
  revoked_at: null,
  issue_request_id: null,
  ...o,
});

describe("integrationReadiness", () => {
  it("is 100% when everything is in place", () => {
    const result = integrationReadiness({
      endpoint: endpoint(),
      credentials: [credential()],
      deliveries: [],
      grantedCount: 2,
    });
    expect(result.percent).toBe(100);
    expect(result.next).toBeNull();
    expect(result.steps.every((s) => s.done)).toBe(true);
  });
  it("starts at 0% and points to the webhook first", () => {
    const result = integrationReadiness({
      endpoint: null,
      credentials: [],
      deliveries: [],
      grantedCount: 0,
    });
    expect(result.percent).toBe(0);
    expect(result.next).toMatchObject({ id: "endpoint", tab: "webhooks" });
  });
  it("counts a delivered test delivery as a tested webhook", () => {
    const result = integrationReadiness({
      endpoint: endpoint({ status: "draft", last_successful_test_at: null }),
      credentials: [credential({ status: "revoked" })],
      deliveries: [delivery("t", "2026-10-22T10:00:00Z", { is_test: true })],
      grantedCount: 1,
    });
    expect(result.steps.find((s) => s.id === "tested")?.done).toBe(true);
    expect(result.steps.find((s) => s.id === "active")?.done).toBe(false);
    expect(result.steps.find((s) => s.id === "credential")?.done).toBe(false);
    expect(result.percent).toBe(60);
    expect(result.next).toMatchObject({ id: "active", tab: "webhooks" });
  });
});

describe("groupPermissions", () => {
  const permissions = [
    { code: "analysis:read", description: "Consultar" },
    { code: "analysis:create", description: "Criar" },
    { code: "application:read", description: "Ler app" },
    { code: "registry.read", description: "Registro" },
  ];
  it("groups by area and counts what is granted", () => {
    const groups = groupPermissions(permissions, [
      "analysis:read",
      "application:read",
    ]);
    expect(groups.map((g) => g.key)).toEqual([
      "analysis",
      "application",
      "registry",
    ]);
    expect(groups[0]).toMatchObject({ label: "Análises", grantedCount: 1 });
    expect(groups[0].items.map((i) => [i.code, i.granted])).toEqual([
      ["analysis:read", true],
      ["analysis:create", false],
    ]);
    expect(groups[1].label).toBe("Aplicação");
    expect(groups[2].label).toBe("Registro");
  });
});

describe("validateRedirectUris", () => {
  it("accepts up to five distinct https addresses", () => {
    const result = validateRedirectUris([
      "https://a.com/cb",
      "https://b.com/cb",
    ]);
    expect(result.ok).toBe(true);
  });
  it("explains each problem per line", () => {
    const result = validateRedirectUris([
      "http://a.com/cb",
      "isso não é url",
      "https://a.com/cb",
      "https://a.com/cb",
      "https://c.com/cb#frag",
    ]);
    expect(result.ok).toBe(false);
    expect(result.problems).toEqual({
      0: "Use HTTPS.",
      1: "Informe uma URL completa.",
      3: "Esta URL já está na lista.",
      4: "Remova o trecho depois de #.",
    });
  });
  it("limits the list to five", () => {
    const six = Array.from({ length: 6 }, (_, i) => `https://s${i}.com/cb`);
    const result = validateRedirectUris(six);
    expect(result.ok).toBe(false);
    expect(result.tooMany).toBe(true);
  });
  it("accepts an empty list (removes every destination)", () => {
    expect(validateRedirectUris([]).ok).toBe(true);
  });
});

describe("permissionAction", () => {
  it("classifies a permission by what it lets the application do", () => {
    expect(permissionAction("analysis:read")).toBe("read");
    expect(permissionAction("registry:create")).toBe("create");
    expect(permissionAction("analysis:write")).toBe("write");
    expect(permissionAction("analysis:submit:upload")).toBe("upload");
    expect(permissionAction("application:read")).toBe("read");
    expect(permissionAction("algo.estranho")).toBe("other");
  });
});

describe("filterPermissionGroups", () => {
  const groups = groupPermissions(
    [
      { code: "analysis:read", description: "Consultar" },
      { code: "analysis:write", description: "Gerenciar" },
      { code: "registry:read", description: "Registro" },
    ],
    ["analysis:read"],
  );
  const titleOf = (code: string) => code.toUpperCase();
  it("keeps everything with no query and mode all", () => {
    expect(filterPermissionGroups(groups, "", "all", titleOf)).toHaveLength(2);
  });
  it("filters by granted state and drops empty groups", () => {
    const granted = filterPermissionGroups(groups, "", "granted", titleOf);
    expect(granted.map((g) => g.key)).toEqual(["analysis"]);
    expect(granted[0].items.map((i) => i.code)).toEqual(["analysis:read"]);
    const missing = filterPermissionGroups(groups, "", "missing", titleOf);
    expect(missing.flatMap((g) => g.items.map((i) => i.code))).toEqual([
      "analysis:write",
      "registry:read",
    ]);
  });
  it("matches the query on title, description or code, ignoring accents and case", () => {
    const result = filterPermissionGroups(groups, "gerenciar", "all", titleOf);
    expect(result.flatMap((g) => g.items.map((i) => i.code))).toEqual([
      "analysis:write",
    ]);
    expect(
      filterPermissionGroups(groups, "REGISTRY", "all", titleOf).map(
        (g) => g.key,
      ),
    ).toEqual(["registry"]);
  });
});
