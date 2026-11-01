export type Breakdown = "by_channel" | "by_source" | "by_product";
export type TrendMetric = "gross" | "contribution";

export const BREAKDOWNS: { id: Breakdown; label: string }[] = [
  { id: "by_channel", label: "Canal" },
  { id: "by_source", label: "Origem" },
  { id: "by_product", label: "Produto" },
];

export const number = new Intl.NumberFormat("pt-BR");

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
