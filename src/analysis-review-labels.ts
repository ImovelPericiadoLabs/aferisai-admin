import { ApiError } from "./api";

export const flagLabels: Record<string, string> = {
  registry_identifier_unresolved: "Identificador registral não resolvido",
  owner_candidate_unresolved: "Pessoa titular não resolvida",
  ownership_chronology_unresolved: "Cronologia de titularidade pendente",
  burden_mention_requires_review: "Menção a ônus exige revisão",
  citation_not_confirmed: "Citação não confirmada pela camada de texto",
  criterion_scope_limited: "Escopo dos critérios limitado",
  timeline_unresolved: "Cronologia exige revisão",
  timeline_reference_unresolved: "Referência entre atos não resolvida",
  cancellation_requires_review: "Cancelamento exige revisão",
  image_evidence_requires_review: "Imagem exige conferência visual",
};

export const citationLabels: Record<string, string> = {
  registration_number: "Número da matrícula",
  registry_office: "Cartório",
  municipality: "Município",
  owner: "Pessoa mencionada",
  penhora: "Penhora",
  hipoteca: "Hipoteca",
  timeline: "Trecho de ato",
  entry_label: "Rótulo do ato",
  reference_label: "Referência a outro ato",
};

export const statusLabels: Record<string, string> = {
  text_found: "Texto localizado",
  text_missing: "Texto não localizado",
  no_text_layer: "Sem camada de texto",
  page_missing: "Página não localizada",
};

export const docStateBadge: Record<string, string> = {
  available: "badge-green",
  expired: "badge-yellow",
  purged: "badge-gray",
};

export const docStateLabel: Record<string, string> = {
  available: "Disponível",
  expired: "Expirado",
  purged: "Apagado",
};

export function errorMessage(cause: unknown): string {
  if (cause instanceof ApiError) return cause.detail;
  return "Não foi possível concluir a solicitação. Tente novamente.";
}
