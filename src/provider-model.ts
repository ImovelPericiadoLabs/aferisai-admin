import {
  ApiError,
  type ActivateProviderBody,
  type AnalysisProviderAccount,
  type AnalysisProviderLimits,
} from "./api";

export type LimitsForm = {
  maxConcurrent: string;
  dailyLimit: string;
  rpm: string;
  tpm: string;
  dailyCostReais: string;
  priority: string;
};

export const ACTIVATION_MODEL = "gemini-3.5-flash-lite";

export function limitsToForm(limits: AnalysisProviderLimits): LimitsForm {
  return {
    maxConcurrent: String(limits.max_concurrent),
    dailyLimit: String(limits.daily_limit),
    rpm: String(limits.rpm),
    tpm: String(limits.tpm),
    dailyCostReais: (limits.daily_cost_cents / 100).toFixed(2),
    priority: String(limits.priority),
  };
}

const fields: {
  key: keyof LimitsForm;
  label: string;
  min: number;
  max?: number;
}[] = [
  { key: "maxConcurrent", label: "Chamadas simultâneas", min: 1, max: 100 },
  { key: "dailyLimit", label: "Chamadas por dia", min: 1 },
  { key: "rpm", label: "Requisições por minuto", min: 1 },
  { key: "tpm", label: "Tokens por minuto", min: 1 },
  { key: "priority", label: "Prioridade", min: 0, max: 1000 },
];

export function formToLimits(
  form: LimitsForm,
):
  | { ok: true; limits: AnalysisProviderLimits }
  | { ok: false; field: keyof LimitsForm; message: string } {
  const integers: Partial<Record<keyof LimitsForm, number>> = {};
  for (const { key, label, min, max } of fields) {
    const text = form[key].trim();
    const value = Number(text);
    if (text === "" || !Number.isInteger(value) || value < min)
      return {
        ok: false,
        field: key,
        message: `${label}: informe um número inteiro a partir de ${min}.`,
      };
    if (max !== undefined && value > max)
      return {
        ok: false,
        field: key,
        message: `${label}: o máximo é ${max}.`,
      };
    integers[key] = value;
  }
  const reais = Number(form.dailyCostReais.trim());
  if (
    form.dailyCostReais.trim() === "" ||
    !Number.isFinite(reais) ||
    reais <= 0
  )
    return {
      ok: false,
      field: "dailyCostReais",
      message: "Teto diário: informe um valor em reais maior que zero.",
    };
  return {
    ok: true,
    limits: {
      max_concurrent: integers.maxConcurrent as number,
      daily_limit: integers.dailyLimit as number,
      rpm: integers.rpm as number,
      tpm: integers.tpm as number,
      daily_cost_cents: Math.round(reais * 100),
      priority: integers.priority as number,
    },
  };
}

export function formatCostPerDay(cents: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)} por dia`;
}

export function validateExternalReserved(text: string): {
  ok: boolean;
  value: number;
  message: string;
} {
  const trimmed = text.trim();
  const value = Number(trimmed);
  if (trimmed === "" || !Number.isInteger(value) || value < 0 || value > 12)
    return {
      ok: false,
      value: 0,
      message: "Informe um número inteiro de 0 a 12.",
    };
  return { ok: true, value, message: "" };
}

export function validateProfileHash(text: string): {
  ok: boolean;
  value: string;
  message: string;
} {
  const value = text.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(value))
    return {
      ok: false,
      value,
      message: "Informe os 64 caracteres hexadecimais do perfil medido.",
    };
  return { ok: true, value, message: "" };
}

export function canActivate(account: AnalysisProviderAccount): {
  ok: boolean;
  reason: string;
} {
  if (account.status !== "draft")
    return { ok: false, reason: "Só contas em rascunho podem ser ativadas." };
  if (account.kind !== "vertex_service_account")
    return {
      ok: false,
      reason:
        "Hoje só a conta de serviço Vertex medida pode ser ativada pelo backend.",
    };
  if (account.location !== "global")
    return {
      ok: false,
      reason: "A ativação exige a região global nesta versão do backend.",
    };
  return { ok: true, reason: "" };
}

export function activationBody(
  account: AnalysisProviderAccount,
  externalReserved: number,
  reason: string,
  profileSha256: string,
): ActivateProviderBody {
  return {
    expected_version: account.version,
    model: ACTIVATION_MODEL,
    expected_profile_sha256: profileSha256,
    external_reserved: externalReserved,
    reason,
  };
}

export function isVersionConflict(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 409;
}

export function shortHash(hash: string | null): string {
  return hash === null ? "—" : `${hash.slice(0, 12)}…`;
}
