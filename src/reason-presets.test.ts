import { describe, expect, it } from "vitest";
import {
  composeReason,
  reasonProblem,
  REASON_PRESETS,
  type ReasonContext,
} from "./reason-presets";

const contexts = Object.keys(REASON_PRESETS) as ReasonContext[];

describe("reason presets", () => {
  it("offers a short list of options for every decision", () => {
    expect(contexts).toEqual(
      expect.arrayContaining([
        "propose-correct",
        "propose-refund",
        "confirm-correct",
        "confirm-refund",
        "reassign",
      ]),
    );
    for (const context of contexts) {
      const list = REASON_PRESETS[context];
      expect(list.length, context).toBeGreaterThanOrEqual(3);
      expect(list.length, context).toBeLessThanOrEqual(6);
    }
  });

  it("ends every list with a free option that needs a description", () => {
    for (const context of contexts) {
      const last = REASON_PRESETS[context].at(-1);
      expect(last?.id, context).toBe("other");
      expect(last?.requiresNote, context).toBe(true);
    }
  });

  it("has ids that do not repeat inside a list and labels long enough to be a valid reason on their own", () => {
    for (const context of contexts) {
      const ids = REASON_PRESETS[context].map((preset) => preset.id);
      expect(new Set(ids).size, context).toBe(ids.length);
      for (const preset of REASON_PRESETS[context].filter(
        (p) => !p.requiresNote,
      ))
        expect(
          preset.label.length,
          `${context}/${preset.id}`,
        ).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("composeReason", () => {
  const list = REASON_PRESETS["propose-refund"];
  const first = list[0];
  const other = list.at(-1)!;

  it("uses the option text alone when no detail is given", () => {
    expect(composeReason(list, first.id, "")).toBe(first.label);
  });

  it("appends a trimmed detail after the option text", () => {
    expect(
      composeReason(list, first.id, "  Cliente avisado por telefone.  "),
    ).toBe(`${first.label}: Cliente avisado por telefone.`);
  });

  it("uses the description alone for the free option", () => {
    expect(
      composeReason(list, other.id, "Caso fora do padrão, ver ticket."),
    ).toBe("Caso fora do padrão, ver ticket.");
  });

  it("returns an empty text while nothing is chosen", () => {
    expect(composeReason(list, "", "algo")).toBe("");
    expect(composeReason(list, "nao-existe", "algo")).toBe("");
  });
});

describe("reasonProblem", () => {
  const list = REASON_PRESETS["confirm-refund"];
  const other = list.at(-1)!;

  it("asks to choose an option first", () => {
    expect(reasonProblem(list, "", "", 10, 500)).toBe("Escolha o motivo.");
  });

  it("accepts a ready-made option", () => {
    expect(reasonProblem(list, list[0].id, "", 10, 500)).toBe("");
  });

  it("requires a description for the free option, with the minimum length", () => {
    expect(reasonProblem(list, other.id, "", 10, 500)).toBe(
      "Descreva o motivo (0/10 caracteres).",
    );
    expect(reasonProblem(list, other.id, "curto", 10, 500)).toBe(
      "Descreva o motivo (5/10 caracteres).",
    );
    expect(reasonProblem(list, other.id, "Descrição suficiente", 10, 500)).toBe(
      "",
    );
  });

  it("rejects a final text longer than the maximum", () => {
    expect(reasonProblem(list, list[0].id, "x".repeat(600), 10, 500)).toMatch(
      /no máximo 500/,
    );
  });
});
