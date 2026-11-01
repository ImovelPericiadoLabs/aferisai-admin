import type { OperationsOverview } from "./api";

export const stateLabel: Record<
  OperationsOverview["services"][number]["state"],
  string
> = {
  operational: "Operacional",
  degraded: "Instável",
  unavailable: "Indisponível",
  unverified: "Sem verificação recente",
};

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
