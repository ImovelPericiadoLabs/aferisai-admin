import { describe, expect, it } from "vitest";
import {
  commissionKindLabel,
  commissionStatusView,
  deliveryRate,
  latencyLabel,
  portalSections,
} from "./partner-finance-model";
import { roleAccess } from "./partner-roles";

describe("portalSections", () => {
  it("lists what each role may open, in a stable order", () => {
    expect(portalSections(roleAccess("owner")).map((s) => s.id)).toEqual([
      "integrations",
      "metrics",
      "statement",
      "people",
    ]);
    expect(portalSections(roleAccess("developer")).map((s) => s.id)).toEqual([
      "integrations",
      "metrics",
    ]);
    expect(
      portalSections(roleAccess("financial_reader")).map((s) => s.id),
    ).toEqual(["metrics", "statement"]);
  });
  it("keeps only integrations for a backend that does not send the role", () => {
    expect(
      portalSections({
        integrations: true,
        metrics: false,
        statement: false,
        people: false,
      }).map((s) => s.id),
    ).toEqual(["integrations"]);
  });
  it("is empty when nothing is allowed", () => {
    expect(portalSections(roleAccess(null))).toEqual([]);
  });
});

describe("deliveryRate", () => {
  it("is delivered over attempts, or null without attempts", () => {
    expect(deliveryRate(17, 20)).toBe(85);
    expect(deliveryRate(1, 3)).toBe(33);
    expect(deliveryRate(0, 0)).toBeNull();
  });
});

describe("latencyLabel", () => {
  it("shows milliseconds or a dash", () => {
    expect(latencyLabel(268.4)).toBe("268 ms");
    expect(latencyLabel(1520)).toBe("1,52 s");
    expect(latencyLabel(null)).toBe("—");
  });
});

describe("commission labels", () => {
  it("maps the four statuses to label and tone", () => {
    expect(commissionStatusView("provisional")).toEqual({
      label: "Provisória",
      tone: "info",
    });
    expect(commissionStatusView("owed")).toEqual({
      label: "A repassar",
      tone: "warning",
    });
    expect(commissionStatusView("settled")).toEqual({
      label: "Repassada",
      tone: "success",
    });
    expect(commissionStatusView("reversed")).toEqual({
      label: "Estornada",
      tone: "neutral",
    });
    expect(commissionStatusView("novo")).toEqual({
      label: "novo",
      tone: "neutral",
    });
  });
  it("names the item kind without inventing one", () => {
    expect(commissionKindLabel("analysis_completed")).toBe(
      "Análise de arquivo",
    );
    expect(commissionKindLabel("registry_completed")).toBe("Pedido registral");
    expect(commissionKindLabel("xyz")).toBe("xyz");
  });
});
