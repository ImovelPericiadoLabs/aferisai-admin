import { ApiError } from "./api";
import type { CaseFilter } from "./exception-model";

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

export const tabs: { value: CaseFilter; label: string }[] = [
  { value: "all", label: "Abertos" },
  { value: "overdue", label: "Atrasados" },
  { value: "mine", label: "Meus" },
  { value: "executing", label: "Em execução" },
  { value: "done", label: "Concluídos" },
];

export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.detail : fallback;
}
