import { ApiError, type AnalysisProviderAccount } from "./api";

export type Filter = "" | AnalysisProviderAccount["status"];
export type Drawer = "closed" | "view" | "create";

export const filters: { value: Filter; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativas" },
  { value: "suspended", label: "Suspensas" },
];

export function errorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 404 || cause.status === 501)
      return "A gestão de provedores ainda não está disponível nesta API.";
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}
