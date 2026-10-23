import { describe, expect, it } from "vitest";
import { accountAge, filterPeople, type Person } from "./people-model";

const people: Person[] = [
  {
    id: "0198a1b2-aaaa",
    email: "ana@aferis.ai",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    role: "administrator",
  },
  {
    id: "0198a1b2-bbbb",
    email: "Bruno@Exemplo.com.br",
    status: "suspended",
    created_at: "2026-02-01T00:00:00Z",
    role: "viewer",
  },
  {
    id: "0198ffff-cccc",
    email: "carla@exemplo.com.br",
    status: "active",
    created_at: "2026-03-01T00:00:00Z",
    role: "viewer",
  },
];

describe("filterPeople", () => {
  it("matches e-mail case-insensitively", () => {
    expect(filterPeople(people, "BRUNO", "", "").map((p) => p.id)).toEqual([
      "0198a1b2-bbbb",
    ]);
  });

  it("matches a fragment in the middle of an e-mail", () => {
    expect(filterPeople(people, "exemplo", "", "")).toHaveLength(2);
  });

  it("matches a fragment of the id", () => {
    expect(filterPeople(people, "ffff", "", "")).toHaveLength(1);
  });

  it("combines status and role filters", () => {
    expect(
      filterPeople(people, "", "active", "viewer").map((p) => p.email),
    ).toEqual(["carla@exemplo.com.br"]);
  });

  it("returns everything for empty filters and trims the query", () => {
    expect(filterPeople(people, "   ", "", "")).toHaveLength(3);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterPeople(people, "zzz", "", "")).toEqual([]);
  });
});

describe("accountAge", () => {
  const now = Date.parse("2026-06-10T12:00:00Z");

  it("says created today for the same day", () => {
    expect(accountAge("2026-06-10T01:00:00Z", now)).toBe("Criada hoje");
  });

  it("uses singular for one day", () => {
    expect(accountAge("2026-06-09T00:00:00Z", now)).toBe("Criada há 1 dia");
  });

  it("uses days under 60 and months after", () => {
    expect(accountAge("2026-05-01T00:00:00Z", now)).toBe("Criada há 40 dias");
    expect(accountAge("2026-01-01T00:00:00Z", now)).toBe("Criada há 5 meses");
  });

  it("returns a dash for future or invalid dates", () => {
    expect(accountAge("2027-01-01T00:00:00Z", now)).toBe("—");
    expect(accountAge("not-a-date", now)).toBe("—");
  });
});
