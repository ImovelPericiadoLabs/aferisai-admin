import { describe, expect, it } from "vitest";
import { endpointId } from "./api-reference";
import { EVENT_ROWS } from "./partner-docs-api";
import { partnerDocs } from "./partner-docs-content";
import { PARTNER_ENDPOINTS } from "./partner-endpoints";
import { REAL_CATALOG_TYPES } from "./webhook-catalog.fixture";

const sectionIds = partnerDocs.pages.flatMap((page) =>
  page.sections.map((section) => section.id),
);

describe("partner endpoint documentation", () => {
  it("documents every endpoint exactly once, with its own section", () => {
    const ids = PARTNER_ENDPOINTS.map(endpointId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids)
      expect(
        sectionIds.filter((s) => s === id),
        id,
      ).toHaveLength(1);
  });

  it("never invents a scope: each one the endpoints name is a documented scope", () => {
    const scopeTable = JSON.stringify(partnerDocs.pages);
    for (const endpoint of PARTNER_ENDPOINTS)
      if (endpoint.scope)
        expect(scopeTable, endpoint.scope).toContain(endpoint.scope);
  });

  it("lists every error and a response for every endpoint", () => {
    for (const endpoint of PARTNER_ENDPOINTS) {
      expect(endpoint.response.text.length, endpoint.path).toBeGreaterThan(0);
      if (endpoint.scope)
        expect(endpoint.errors.length, endpoint.path).toBeGreaterThan(0);
    }
  });

  it("explains every webhook event and no event that does not exist", () => {
    const documented = EVENT_ROWS.map((row) => row[0].replaceAll("`", ""));
    const real = REAL_CATALOG_TYPES.filter((type) => type !== "webhook.test");
    expect([...documented].sort()).toEqual([...real].sort());
  });

  it("names, for every event, the scope the token needs", () => {
    for (const row of EVENT_ROWS) expect(row[1]).toMatch(/^`events:[a-z]+`$/);
  });
});
