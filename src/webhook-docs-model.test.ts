import { describe, expect, it } from "vitest";
import {
  REAL_CATALOG_ITEMS,
  REAL_CATALOG_TYPES,
} from "./webhook-catalog.fixture";
import {
  eventGroupOf,
  fieldsFromSchema,
  groupEvents,
  nextTabIndex,
} from "./webhook-docs-model";
import { eventDefinitionFromBackend } from "./webhook-payloads";

const item = (type: string) => {
  const found = REAL_CATALOG_ITEMS.find((entry) => entry.type === type);
  if (!found) throw new Error(`fixture lacks ${type}`);
  return found as unknown as Parameters<typeof eventDefinitionFromBackend>[0];
};

describe("fieldsFromSchema", () => {
  it("follows the $ref to the data model and keeps optional fields", () => {
    const fields = fieldsFromSchema(item("payment.confirmed").json_schema);
    expect(fields.map((f) => f.name)).toEqual([
      "data.resource_type",
      "data.resource_id",
      "data.status",
      "data.quote_id",
      "data.payment_id",
      "data.certificate_code",
    ]);
  });

  it("marks required and optional fields from the schema's required list", () => {
    const byName = Object.fromEntries(
      fieldsFromSchema(item("payment.confirmed").json_schema).map((f) => [
        f.name,
        f.required,
      ]),
    );
    expect(byName["data.resource_type"]).toBe(true);
    expect(byName["data.resource_id"]).toBe(true);
    expect(byName["data.status"]).toBe(false);
    expect(byName["data.certificate_code"]).toBe(false);
  });

  it("describes types the way a receiver needs them", () => {
    const byName = Object.fromEntries(
      fieldsFromSchema(item("payment.confirmed").json_schema).map((f) => [
        f.name,
        f.type,
      ]),
    );
    expect(byName["data.resource_id"]).toBe("UUID");
    expect(byName["data.resource_type"]).toBe("texto (até 64)");
    expect(byName["data.status"]).toBe("texto (até 64) ou nulo");
    expect(byName["data.quote_id"]).toBe("UUID ou nulo");
  });

  it("handles a constant boolean, with and without a null alternative", () => {
    const test = Object.fromEntries(
      fieldsFromSchema(item("webhook.test").json_schema).map((f) => [
        f.name,
        f,
      ]),
    );
    expect(test["data.synthetic"].type).toBe("booleano (sempre true)");
    expect(test["data.message"].required).toBe(true);
    const analysis = Object.fromEntries(
      fieldsFromSchema(item("analysis.created").json_schema).map((f) => [
        f.name,
        f,
      ]),
    );
    expect(analysis["data.synthetic"].type).toBe(
      "booleano (sempre true) ou nulo",
    );
    expect(analysis["data.synthetic"].required).toBe(false);
  });

  it("returns nothing, instead of throwing, for a schema it does not understand", () => {
    expect(fieldsFromSchema({})).toEqual([]);
    expect(
      fieldsFromSchema({ properties: { data: { $ref: "#/$defs/Nope" } } }),
    ).toEqual([]);
  });
});

describe("eventDefinitionFromBackend with the real catalog", () => {
  it("uses the schema fields, not only the example's keys", () => {
    const definition = eventDefinitionFromBackend(item("payment.confirmed"));
    expect(definition.fields.map((f) => f.name)).toContain("data.status");
    expect(
      definition.fields.find((f) => f.name === "data.resource_id")?.type,
    ).toBe("UUID");
  });

  it("gives every event of the real catalog a title and a description in Portuguese", () => {
    for (const type of REAL_CATALOG_TYPES) {
      const definition = eventDefinitionFromBackend({
        ...item(
          type.startsWith("analysis.")
            ? "analysis.created"
            : "payment.confirmed",
        ),
        type,
      });
      expect(definition.title, type).not.toBe(type);
      expect(definition.description, type).not.toMatch(
        /publicado pelo catálogo/,
      );
    }
  });

  it("does not describe a field with a generic placeholder sentence", () => {
    for (const type of [
      "analysis.created",
      "payment.confirmed",
      "webhook.test",
    ]) {
      for (const field of eventDefinitionFromBackend(item(type)).fields)
        expect(field.description, `${type} ${field.name}`).not.toMatch(
          /^Campo \w+ do evento/,
        );
    }
  });
});

describe("eventGroupOf", () => {
  it("groups by the prefix before the first dot", () => {
    expect(eventGroupOf("registry.preview.completed")).toBe("registry");
    expect(eventGroupOf("payment.created")).toBe("payment");
  });
  it("sends an unknown prefix to the last group", () => {
    expect(eventGroupOf("something.new")).toBe("other");
    expect(eventGroupOf("noprefix")).toBe("other");
  });
});

describe("groupEvents", () => {
  const events = REAL_CATALOG_TYPES.map((type) => ({
    type,
    title: eventDefinitionFromBackend({
      ...item(
        type.startsWith("analysis.") ? "analysis.created" : "payment.confirmed",
      ),
      type,
    }).title,
  }));

  it("keeps the documented group order and every event exactly once", () => {
    const groups = groupEvents(events, "");
    expect(groups.map((g) => g.id)).toEqual([
      "analysis",
      "registry",
      "payment",
      "acquisition",
      "certificate",
      "connection",
      "credential",
      "commission",
      "webhook",
    ]);
    expect(groups.flatMap((g) => g.events.map((e) => e.type)).sort()).toEqual(
      [...REAL_CATALOG_TYPES].sort(),
    );
  });

  it("filters by event name", () => {
    const groups = groupEvents(events, "quote");
    expect(groups.flatMap((g) => g.events.map((e) => e.type))).toEqual([
      "registry.quote.created",
      "registry.quote.expired",
    ]);
  });

  it("ignores case, surrounding spaces and accents when matching a title", () => {
    const hit = groupEvents(events, "  ANALISE ").flatMap((g) => g.events);
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.every((e) => e.type.startsWith("analysis."))).toBe(true);
  });

  it("returns no groups when nothing matches", () => {
    expect(groupEvents(events, "zzz")).toEqual([]);
  });
});

describe("nextTabIndex", () => {
  it("moves with the arrows and wraps around", () => {
    expect(nextTabIndex(0, "ArrowRight", 4)).toBe(1);
    expect(nextTabIndex(3, "ArrowRight", 4)).toBe(0);
    expect(nextTabIndex(0, "ArrowLeft", 4)).toBe(3);
  });
  it("jumps to the ends with Home and End", () => {
    expect(nextTabIndex(2, "Home", 4)).toBe(0);
    expect(nextTabIndex(1, "End", 4)).toBe(3);
  });
  it("ignores other keys", () => {
    expect(nextTabIndex(1, "Enter", 4)).toBeNull();
  });
});
