import type { AnalysisProviderKind } from "./api";
import { limitsToForm, type LimitsForm } from "./provider-model";

export const poolExamples: Record<AnalysisProviderKind, string> = {
  vertex_service_account: "gcp:ID_DO_PROJETO",
  gemini_api_key: "gcp:ID_DO_PROJETO",
  openai_api_key: "openai:CONTA",
  openai_compatible: "custom:SERVICO",
};

export const initialLimits: LimitsForm = limitsToForm({
  max_concurrent: 1,
  daily_limit: 100,
  rpm: 10,
  tpm: 10000,
  daily_cost_cents: 1000,
  priority: 100,
});

export const limitFields: {
  key: keyof LimitsForm;
  label: string;
  step: string;
}[] = [
  { key: "maxConcurrent", label: "Chamadas simultâneas", step: "1" },
  { key: "dailyLimit", label: "Chamadas por dia", step: "1" },
  { key: "rpm", label: "Requisições por minuto", step: "1" },
  { key: "tpm", label: "Tokens por minuto", step: "1" },
  { key: "dailyCostReais", label: "Teto diário (R$)", step: "0.01" },
  { key: "priority", label: "Prioridade (menor vem primeiro)", step: "1" },
];
