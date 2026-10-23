import { describe, expect, it } from "vitest";
import { buildSampleReports } from "./executive-fixture";
import { periodFor } from "./executive-model";
import { csvEscape, exportFilename, toCsv } from "./executive-export";

const period = periodFor(7, new Date("2026-10-23T15:00:00Z"));
const data = buildSampleReports(period, true);

describe("csvEscape", () => {
  it("quotes values with separators, quotes or line breaks", () => {
    expect(csvEscape("simples")).toBe("simples");
    expect(csvEscape("a;b")).toBe('"a;b"');
    expect(csvEscape('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvEscape("linha\nnova")).toBe('"linha\nnova"');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvEscape("=SOMA(A1)")).toBe("'=SOMA(A1)");
    expect(csvEscape("+1")).toBe("'+1");
    expect(csvEscape("@x")).toBe("'@x");
  });
});

describe("exportFilename", () => {
  it("carries the period and says when the numbers are a sample", () => {
    expect(exportFilename(period, true)).toBe(
      "painel-executivo_2026-10-17_2026-10-23_exemplo.csv",
    );
    expect(exportFilename(period, false)).toBe(
      "painel-executivo_2026-10-17_2026-10-23.csv",
    );
  });
});

describe("toCsv", () => {
  const csv = toCsv(data, period, true);
  const lines = csv.split("\r\n");
  it("starts with a byte-order mark so Excel reads UTF-8, and states the origin", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Dados de exemplo");
    expect(csv).toContain("17/10/2026 a 23/10/2026");
    expect(csv).toContain("America/Sao_Paulo");
  });
  it("writes money in reais with a decimal comma and counts as integers", () => {
    const gross = lines.find((l) => l.startsWith("Receita bruta;"))!;
    expect(gross).toMatch(/^Receita bruta;\d+,\d{2}$/);
    expect(lines.find((l) => l.startsWith("Pagamentos recebidos;"))).toMatch(
      /^Pagamentos recebidos;\d+$/,
    );
  });
  it("has one daily row per day of the period", () => {
    const start = lines.indexOf(
      "Data;Receita bruta;Margem de contribuição;Pagamentos",
    );
    expect(start).toBeGreaterThan(0);
    expect(
      lines
        .slice(start + 1, start + 8)
        .every((l) => /^\d{4}-\d{2}-\d{2};/.test(l)),
    ).toBe(true);
    expect(lines[start + 8]).toBe("");
  });
  it("includes funnel, channels and partners but no personal data", () => {
    expect(csv).toContain("Funil");
    expect(csv).toContain("Integração de parceiro");
    expect(csv).toContain("Cartório Exemplo Alfa");
    expect(csv).not.toMatch(/@/);
  });
});
