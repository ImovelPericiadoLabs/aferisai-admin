import { ApiError } from "./api";
import type { PromotionState } from "./promotion-model";

export const dateShort = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export const tabs: { value: "" | PromotionState; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "scheduled", label: "Agendadas" },
  { value: "exhausted", label: "Esgotadas" },
  { value: "expired", label: "Expiradas" },
  { value: "suspended", label: "Suspensas" },
];

export function errorMessage(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível consultar a API agora.";
}
