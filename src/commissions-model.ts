import { ApiError } from "./api";
import { statusLabel as genericStatusLabel } from "./display-labels";

export type CommissionsView = "entries" | "settlements";

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

export function statusLabel(status: string): string {
  if (status === "provisional") return "Provisório";
  if (status === "owed") return "Devido";
  if (status === "settled") return "Liquidado";
  if (status === "reversed") return "Revertido";
  return genericStatusLabel(status);
}

export function statusClass(status: string): string {
  if (status === "owed") return "badge-blue";
  if (status === "settled") return "badge-green";
  if (status === "reversed") return "badge-red";
  return "badge-gray";
}

export function errorMessage(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível consultar a API agora.";
}
