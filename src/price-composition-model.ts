import type { RegistryHistoricalProduct } from "./api";

export const products: { value: RegistryHistoricalProduct; label: string }[] = [
  { value: "inteiro_teor_simples", label: "Inteiro teor simples" },
  { value: "inteiro_teor", label: "Inteiro teor" },
  { value: "visualizacao", label: "Visualização de matrícula" },
];
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
export const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});
