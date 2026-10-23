import { describe, expect, it } from "vitest";
import {
  DECISION_OPTIONS,
  coverageLabel,
  filterOrders,
  historyView,
  latestReviewId,
  portalStatusText,
  shortId,
  shortSha,
} from "./onr-review-model";

const review = (version: number, sha: string, decision = "inconclusive") => ({
  id: `r${version}`,
  version,
  decision,
  reason: `motivo da versão ${version} com texto suficiente`,
  portal_orders_sha256: sha,
  observed_at: `2026-10-${10 + version}T12:00:00Z`,
  actor_team_member_id: "t1",
  previous_review_id: version > 1 ? `r${version - 1}` : null,
});

describe("labels and short forms", () => {
  it("explains the coverage in plain words", () => {
    expect(coverageLabel("observed_pages_only")).toMatch(/páginas lidas/);
    expect(coverageLabel("visible_page_only")).toMatch(/Só a página visível/);
    expect(coverageLabel("outra")).toBe("outra");
  });

  it("shortens ids and digests", () => {
    expect(shortSha("a".repeat(64))).toBe("aaaaaaaa…aaaa");
    expect(shortId("01a16a55-22ae-77de-b5df-6c5ac01f10a4")).toBe("01a16a55");
  });

  it("shows the portal's own status text, never an invented label", () => {
    expect(portalStatusText("  Em andamento ")).toBe("Em andamento");
    expect(portalStatusText("")).toBe("—");
  });
});

describe("filterOrders", () => {
  const orders = [
    { protocol: "P26090880915D", date: "25/09/2026", status: "Pronto" },
    { protocol: "P26081097994D", date: "26/08/2026", status: "Em andamento" },
  ];
  it("matches protocol, date or status without caring for case or spaces", () => {
    expect(filterOrders(orders, " p2609 ")).toHaveLength(1);
    expect(filterOrders(orders, "26/08")).toHaveLength(1);
    expect(filterOrders(orders, "andamento")).toHaveLength(1);
  });
  it("returns everything for an empty query", () => {
    expect(filterOrders(orders, "")).toHaveLength(2);
  });
});

describe("history", () => {
  const items = [
    review(1, "a".repeat(64)),
    review(2, "b".repeat(64)),
    review(3, "b".repeat(64)),
  ];

  it("uses the highest version as the previous review of a correction", () => {
    expect(latestReviewId(items)).toBe("r3");
    expect(latestReviewId([])).toBeNull();
  });

  it("lists newest first and flags versions made on today's listing", () => {
    const view = historyView(items, "b".repeat(64));
    expect(view.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(view.map((v) => v.sameListing)).toEqual([true, true, false]);
  });

  it("marks the current version", () => {
    expect(historyView(items, "x").map((v) => v.current)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("decision options", () => {
  it("covers the four backend decisions, inconclusive being the safe default", () => {
    expect(DECISION_OPTIONS.map((o) => o.value)).toEqual([
      "inconclusive",
      "draft_absent",
      "draft_present",
      "purchase_suspected",
    ]);
  });
});
