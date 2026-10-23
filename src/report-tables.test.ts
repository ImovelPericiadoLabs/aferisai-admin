import { describe, expect, it } from "vitest";
import { buildSampleReports } from "./executive-sample";
import { periodFor } from "./executive-model";
import {
  REPORTS,
  cellCsv,
  cellText,
  reportFilename,
  reportTables,
  tablesToCsv,
  type Cell,
} from "./report-tables";

const period = periodFor(30, new Date("2026-10-23T15:00:00Z"));
const data = buildSampleReports(period, true);
const noCompare = buildSampleReports(period, false);

describe("cells", () => {
  const cases: [Cell, string, string][] = [
    [{ t: "text", v: "Site" }, "Site", "Site"],
    [{ t: "money", v: 123456 }, "R$ 1.234,56", "1234,56"],
    [{ t: "count", v: 12345 }, "12.345", "12345"],
    [{ t: "bps", v: 1234 }, "12,3%", "12,34"],
    [{ t: "bps", v: null }, "—", ""],
    [{ t: "duration", v: 150 }, "2 min 30 s", "150"],
    [{ t: "duration", v: null }, "—", ""],
    [{ t: "delta", v: 720 }, "+7,2%", "7,2"],
    [{ t: "delta", v: -90 }, "−0,9%", "-0,9"],
    [{ t: "delta", v: null }, "—", ""],
  ];
  for (const [cell, text, csv] of cases)
    it(`${cell.t} ${JSON.stringify(cell.v)} shows "${text}" and exports "${csv}"`, () => {
      expect(cellText(cell)).toBe(text);
      expect(cellCsv(cell)).toBe(csv);
    });
});

describe("report list", () => {
  it("offers the five themed reports", () => {
    expect(REPORTS.map((r) => r.id)).toEqual([
      "financeiro",
      "funil",
      "parceiros",
      "fornecedores",
      "integracoes",
    ]);
  });
});

describe("financeiro", () => {
  const tables = reportTables("financeiro", data, period);
  it("has summary, daily, channel, source and product tables", () => {
    expect(tables.map((t) => t.id)).toEqual([
      "resumo",
      "dia",
      "canal",
      "origem",
      "produto",
    ]);
  });
  it("compares the summary with the previous period, and drops the comparison when it is off", () => {
    const summary = tables[0];
    expect(summary.columns.map((c) => c.label)).toEqual([
      "Indicador",
      "Período",
      "Anterior",
      "Variação",
    ]);
    const gross = summary.rows.find((r) => cellText(r[0]) === "Receita bruta")!;
    expect(gross[1]).toEqual({ t: "money", v: data.revenue.totals.gross_cents });
    expect(gross[2]).toEqual({ t: "money", v: data.revenue.previous!.gross_cents });
    expect((gross[3] as Cell & { t: "delta" }).v).not.toBeNull();
    const off = reportTables("financeiro", noCompare, period)[0];
    expect(off.columns.map((c) => c.label)).toEqual(["Indicador", "Período"]);
  });
  it("lists every day of the period with a derived average ticket", () => {
    const daily = tables[1];
    expect(daily.rows).toHaveLength(30);
    const first = daily.rows[0];
    expect(first[0]).toEqual({ t: "text", v: period.from.split("-").reverse().join("/") });
    const day = data.revenue.series[0];
    expect(first[4]).toEqual({
      t: "money",
      v: Math.round(day.gross_cents / day.intents),
    });
  });
  it("shows each slice's share of the revenue, summing to about 100%", () => {
    const channel = tables[2];
    const shares = channel.rows.map((r) => (r[3] as Cell & { t: "bps" }).v ?? 0);
    expect(shares.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(9990);
    expect(shares.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(10010);
  });
});

describe("other reports", () => {
  it("funnel: each step with share of total, of the previous step and the change", () => {
    const [funnel] = reportTables("funil", data, period);
    expect(funnel.columns.map((c) => c.label)).toEqual([
      "Etapa",
      "Quantidade",
      "% do total",
      "% da etapa anterior",
      "Período anterior",
      "Variação",
    ]);
    expect(funnel.rows).toHaveLength(5);
    expect(cellText(funnel.rows[0][0])).toBe("Pedidos");
  });
  it("partners: ranking by revenue with the commission share", () => {
    const [ranking] = reportTables("parceiros", data, period);
    const revenues = ranking.rows.map((r) => (r[3] as Cell & { t: "money" }).v);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
    expect(ranking.columns.at(-1)!.label).toBe("Comissão sobre a receita");
  });
  it("suppliers and integrations produce tables with rows", () => {
    expect(reportTables("fornecedores", data, period).every((t) => t.rows.length > 0)).toBe(true);
    expect(reportTables("integracoes", data, period).every((t) => t.rows.length > 0)).toBe(true);
  });
});

describe("csv", () => {
  const csv = tablesToCsv("Financeiro", reportTables("financeiro", data, period), period, true);
  it("states report, period, zone and the sample origin, with a BOM", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Relatório Financeiro");
    expect(csv).toContain("America/Sao_Paulo");
    expect(csv).toContain("Dados de exemplo");
  });
  it("exports raw numbers, not currency-formatted text", () => {
    expect(csv).not.toMatch(/R\$ \d/);
    expect(csv).toMatch(/Receita bruta;\d+,\d{2};/);
  });
  it("names the file after the report and period", () => {
    expect(reportFilename("financeiro", period, true)).toBe(
      `relatorio-financeiro_${period.from}_${period.to}_exemplo.csv`,
    );
  });
});
