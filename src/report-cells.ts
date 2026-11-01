import { formatBRL, formatDuration, formatPercentBps } from "./executive-model";

export type Cell =
  | { t: "text"; v: string }
  | { t: "money"; v: number }
  | { t: "count"; v: number }
  | { t: "bps"; v: number | null }
  | { t: "duration"; v: number | null }
  | { t: "delta"; v: number | null };

export type Column = { label: string; align?: "right" };
export type Table = {
  id: string;
  title: string;
  note?: string;
  columns: Column[];
  rows: Cell[][];
};

export const text = (v: string): Cell => ({ t: "text", v });
export const money = (v: number): Cell => ({ t: "money", v });
export const count = (v: number): Cell => ({ t: "count", v });
export const bps = (v: number | null): Cell => ({ t: "bps", v });
export const duration = (v: number | null): Cell => ({ t: "duration", v });
export const delta = (v: number | null): Cell => ({ t: "delta", v });
export const br = (iso: string) => iso.split("-").reverse().join("/");

const number = new Intl.NumberFormat("pt-BR");
const decimal = (n: number) => String(n).replace(".", ",");

export function cellText(cell: Cell): string {
  switch (cell.t) {
    case "text":
      return cell.v;
    case "money":
      return formatBRL(cell.v);
    case "count":
      return number.format(cell.v);
    case "bps":
      return cell.v === null ? "—" : formatPercentBps(cell.v);
    case "duration":
      return formatDuration(cell.v);
    case "delta":
      if (cell.v === null) return "—";
      return `${cell.v >= 0 ? "+" : "−"}${formatPercentBps(Math.abs(cell.v))}`;
  }
}

/** Raw value for spreadsheets: reais and percentages with a decimal comma, seconds as numbers. */
export function cellCsv(cell: Cell): string {
  switch (cell.t) {
    case "text":
      return cell.v;
    case "money":
      return (cell.v / 100).toFixed(2).replace(".", ",");
    case "count":
      return String(cell.v);
    case "bps":
    case "delta":
      return cell.v === null ? "" : decimal(Math.round(cell.v) / 100);
    case "duration":
      return cell.v === null ? "" : String(Math.round(cell.v));
  }
}

export const NUM = { align: "right" as const };
