import { ApiError, type SourceKind } from "./api";

export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const sourceLabels: Record<SourceKind, string> = {
  registry_record: "Documento registral",
  third_party_report: "Relatório derivado",
  unverified: "Natureza não verificada",
};

export function message(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível confirmar a resposta da API. Consulte a última decisão antes de tentar novamente.";
}
