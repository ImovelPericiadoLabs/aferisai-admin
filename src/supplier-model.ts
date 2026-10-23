import type {
  RegistrySupplierAccount,
  RegistrySupplierKind,
  RegistrySupplierCreate,
} from "./api";
import { validateReason } from "./reason";

export type SupplierForm = {
  label: string;
  provider: RegistrySupplierKind;
  email: string;
  password: string;
  token: string;
  portalDigest: string;
  reason: string;
};

export type SupplierErrors = Partial<
  Record<
    "label" | "email" | "password" | "token" | "portalDigest" | "reason",
    string
  >
>;

export const supplierLabel = (provider: RegistrySupplierKind) =>
  provider === "onr" ? "RI Digital (ONR)" : "InfoSimples";

const STATUS = {
  draft: { label: "Rascunho", tone: "neutral" },
  active: { label: "Ativa", tone: "success" },
  suspended: { label: "Suspensa", tone: "warning" },
} as const;

export const supplierStatusView = (status: RegistrySupplierAccount["status"]) =>
  STATUS[status];

export const shortDigest = (digest: string) =>
  digest.length > 14 ? `${digest.slice(0, 8)}…${digest.slice(-4)}` : digest;

/** Mirrors the backend limits (app/acquisition/supplier_account_schemas.py). */
export function validateSupplierForm(form: SupplierForm): {
  ok: boolean;
  errors: SupplierErrors;
} {
  const errors: SupplierErrors = {};
  const label = form.label.trim();
  if (label.length < 3 || label.length > 120)
    errors.label = "O nome interno precisa ter de 3 a 120 caracteres.";
  const email = form.email.trim();
  if (email.length < 3 || email.length > 254)
    errors.email = "Informe o login do portal (3 a 254 caracteres).";
  if (form.password.length < 1 || form.password.length > 4096)
    errors.password = "Informe a senha (até 4096 caracteres).";
  if (form.provider === "infosimples") {
    if (form.token.length < 1)
      errors.token = "A InfoSimples exige o token da conta.";
    const digest = form.portalDigest.trim();
    if (digest !== "" && !/^[0-9a-f]{64}$/i.test(digest))
      errors.portalDigest =
        "O digest da conta do portal tem 64 caracteres hexadecimais.";
  }
  const reason = validateReason(form.reason, 10, 500);
  if (!reason.ok) errors.reason = reason.message;
  return { ok: Object.keys(errors).length === 0, errors };
}

export function supplierBody(form: SupplierForm): RegistrySupplierCreate {
  const infosimples = form.provider === "infosimples";
  const digest = form.portalDigest.trim().toLowerCase();
  return {
    label: form.label.trim(),
    provider: form.provider,
    email: form.email.trim(),
    password: form.password,
    token: infosimples ? form.token : null,
    portal_account_sha256: infosimples && digest !== "" ? digest : null,
    reason: form.reason.trim(),
  };
}

/** Why an account cannot be activated now, or null. One active account per supplier. */
export function activationBlock(
  account: RegistrySupplierAccount,
  all: RegistrySupplierAccount[],
): string | null {
  if (account.status === "active") return "Esta conta já está ativa.";
  const other = all.find(
    (item) =>
      item.id !== account.id &&
      item.provider === account.provider &&
      item.status === "active",
  );
  return other
    ? `Já existe uma conta ativa de ${supplierLabel(account.provider)}. Suspenda a atual antes de ativar esta.`
    : null;
}
