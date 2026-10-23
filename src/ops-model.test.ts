import { describe, expect, it } from "vitest";
import {
  ageLabel,
  ageTone,
  matchesQuery,
  readPrefs,
  rowsToCsv,
  writePrefs,
} from "./ops-model";

const NOW = Date.parse("2026-10-23T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const H = 60 * MIN;

describe("ageLabel", () => {
  it("speaks in the largest sensible unit", () => {
    expect(ageLabel(ago(20_000), NOW)).toBe("agora");
    expect(ageLabel(ago(12 * MIN), NOW)).toBe("12 min");
    expect(ageLabel(ago(3 * H + 20 * MIN), NOW)).toBe("3 h");
    expect(ageLabel(ago(50 * H), NOW)).toBe("2 d");
  });
  it("never goes negative for a clock slightly ahead", () => {
    expect(ageLabel(ago(-5 * MIN), NOW)).toBe("agora");
  });
  it("returns a dash for an unreadable date", () => {
    expect(ageLabel("lixo", NOW)).toBe("—");
  });
});

describe("ageTone", () => {
  it("escalates with the age", () => {
    expect(ageTone(ago(1 * H), NOW, 24, 72)).toBe("ok");
    expect(ageTone(ago(30 * H), NOW, 24, 72)).toBe("warn");
    expect(ageTone(ago(80 * H), NOW, 24, 72)).toBe("danger");
  });
});

describe("matchesQuery", () => {
  it("needs every typed word somewhere in the fields, ignoring case and accents", () => {
    const fields = ["Pedido 0199F6D9", "Inteiro teor", "Concluído"];
    expect(matchesQuery(fields, "0199f6")).toBe(true);
    expect(matchesQuery(fields, "inteiro concluido")).toBe(true);
    expect(matchesQuery(fields, "inteiro falha")).toBe(false);
    expect(matchesQuery(fields, "   ")).toBe(true);
  });
});

describe("rowsToCsv", () => {
  it("uses ; with a BOM, quotes, and neutralises formulas", () => {
    const csv = rowsToCsv(
      ["Pedido", "Nota"],
      [
        ["a;b", '=HYPERLINK("x")'],
        ["2", "ok"],
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"a;b";"\'=HYPERLINK(""x"")"');
    expect(csv.split("\r\n")).toHaveLength(3);
  });
});

describe("table preferences", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  };
  it("round-trips density and hidden columns", () => {
    const storage = memory();
    writePrefs("t", { density: "compact", hidden: ["pages"] }, storage);
    expect(readPrefs("t", storage)).toEqual({
      density: "compact",
      hidden: ["pages"],
    });
  });
  it("falls back to defaults on missing or broken data", () => {
    const storage = memory();
    expect(readPrefs("x", storage)).toEqual({
      density: "comfortable",
      hidden: [],
    });
    storage.setItem("ops-table:y", "{nao json");
    expect(readPrefs("y", storage)).toEqual({
      density: "comfortable",
      hidden: [],
    });
  });
  it("survives a storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readPrefs("z", broken)).toEqual({
      density: "comfortable",
      hidden: [],
    });
    expect(() =>
      writePrefs("z", { density: "compact", hidden: [] }, broken),
    ).not.toThrow();
  });
});
