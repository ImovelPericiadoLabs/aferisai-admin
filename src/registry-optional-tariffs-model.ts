import type { RegistryCertificateKind } from "./api";
import type { LimitRange } from "./registry-tariff-model";

export const certificateKinds: {
  value: RegistryCertificateKind;
  label: string;
}[] = [
  { value: "federal", label: "Federal" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "estadual", label: "Estadual por UF" },
  { value: "fgts", label: "FGTS" },
  { value: "iptu_sp", label: "IPTU São Paulo" },
  { value: "iptu_rj", label: "IPTU Rio de Janeiro" },
  { value: "cnj", label: "CNJ" },
  { value: "cgu", label: "CGU" },
];

export type EvidenceMode = "supplier_file" | "admin_declaration";

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const sha = (value: string) => /^[0-9a-f]{64}$/.test(value);
export const DEFAULT_RANGE: LimitRange = { min: 1, max: 100_000 };
export const DEFAULT_REASON: LimitRange = { min: 10, max: 500 };

export const parseMoney = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  return /^\d+(?:\.\d{1,2})?$/.test(normalized)
    ? Math.round(Number(normalized) * 100)
    : NaN;
};

export const inRange = (value: number, range: LimitRange) =>
  Number.isSafeInteger(value) && value >= range.min && value <= range.max;
export const lengthOk = (text: string, range: LimitRange) =>
  text.trim().length >= range.min && text.trim().length <= range.max;
