import { request } from "./api-core";
import type { TariffLimitRange } from "./api-registry-prices";

export type RegistryCommercialTerms = {
  id: string;
  onr_account_id: string | null;
  version: string;
  approved_at: string | null;
  valid_until: string;
  analysis_reserve_cents: number;
  analysis_call_reserve_cents: number;
  analysis_planned_calls: number;
  operations_reserve_cents: number;
  exception_reserve_cents: number;
  payment_fee_cents: number;
  payment_fee_rate_bps: number;
  tax_rate_bps: number;
  minimum_contribution_cents: number;
  markup_bps: number;
  onr_markup_bps: number;
  commercial_evidence_sha256: string | null;
  previous_id?: string | null;
};

export type RegistryCommercialTermsPage = {
  effective: RegistryCommercialTerms | null;
  items: RegistryCommercialTerms[];
  next_cursor: string | null;
  limits?: import("./commercial-form-model").CommercialLimits;
};

export type RegistryCommercialTermsCreate = {
  base_offer_id: string;
  version: string;
  analysis_call_reserve_cents: number;
  operations_reserve_cents: number;
  exception_reserve_cents: number;
  payment_fee_cents: number;
  payment_fee_rate_bps: number;
  tax_rate_bps: number;
  minimum_contribution_cents: number;
  markup_bps: number;
  onr_markup_bps: number;
  payment_fee_evidence_sha256: string | null;
  reason: string;
};

export const listRegistryCommercialTerms = (
  accountId: string,
  cursor?: string,
) =>
  request<RegistryCommercialTermsPage>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/commercial-terms?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const publishRegistryCommercialTerms = (
  accountId: string,
  body: RegistryCommercialTermsCreate,
  csrfToken: string,
) =>
  request<RegistryCommercialTerms>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/commercial-terms`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

export type RegistryCertificateKind =
  | "federal"
  | "trabalhista"
  | "estadual"
  | "fgts"
  | "iptu_sp"
  | "iptu_rj"
  | "cnj"
  | "cgu";

export type RegistryCertificateTariff = {
  id: string;
  account_id: string;
  code: RegistryCertificateKind;
  state: string | null;
  provider: "infosimples";
  unit_cost_cents: number;
  source_url: string;
  evidence_sha256: string;
  evidence_mode?: "supplier_file" | "admin_declaration";
  operational_attestation?: boolean;
  sample_document_sha256: string | null;
  sample_charge_sha256: string | null;
  actor_team_member_id: string;
  reason: string;
  verified_at: string;
  valid_until: string; /** True when the tariff has no automatic expiry (valid_until is a technical sentinel). */
  managed?: boolean;
  previous_id?: string | null;
};

export type RegistryCertificateTariffPage = {
  items: RegistryCertificateTariff[];
  next_cursor: string | null;
  limits?: {
    unit_cost_cents?: TariffLimitRange;
    reason_length?: TariffLimitRange;
  };
};

export type RegistryCertificateTariffCreate = {
  account_id: string;
  code: RegistryCertificateKind;
  state: string | null;
  unit_cost_cents: number;
  evidence_mode: "supplier_file" | "admin_declaration";
  evidence_sha256: string | null;
  operational_attestation: true | null;
  sample_document_sha256: string | null;
  sample_charge_sha256: string | null;
  delivery_proof_confirmed: true | null;
  reason: string;
  contract_verified: true;
  supplier_fee_covered: true;
};

export const listRegistryCertificateTariffs = (
  accountId: string,
  cursor?: string,
) =>
  request<RegistryCertificateTariffPage>(
    `/v1/team/registry-certificate-tariffs?account_id=${encodeURIComponent(accountId)}&limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const publishRegistryCertificateTariff = (
  body: RegistryCertificateTariffCreate,
  csrfToken: string,
) =>
  request<RegistryCertificateTariff>("/v1/team/registry-certificate-tariffs", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export type RegistryArispTariff = {
  id: string;
  infosimples_account_id: string;
  onr_account_id: string;
  onr_binding_sha256: string;
  order_fee_cents: number;
  download_fee_cents: number;
  download_budget_count: number;
  budget_cents: number;
  source_url: string;
  evidence_sha256: string;
  evidence_mode?: "supplier_file" | "admin_declaration";
  certificate_type: string | null;
  certificate_type_evidence_sha256: string | null;
  actor_team_member_id: string;
  reason: string;
  verified_at: string;
  valid_until: string; /** True when the tariff has no automatic expiry (valid_until is a technical sentinel). */
  managed?: boolean;
  previous_id?: string | null;
};

export type RegistryArispTariffPage = {
  items: RegistryArispTariff[];
  next_cursor: string | null;
  limits?: {
    order_fee_cents?: TariffLimitRange;
    download_fee_cents?: TariffLimitRange;
    reason_length?: TariffLimitRange;
    download_budget_count?: TariffLimitRange;
  };
};

export type RegistryArispTariffCreate = {
  infosimples_account_id: string;
  onr_account_id: string;
  order_fee_cents: number;
  download_fee_cents: number;
  evidence_mode: "supplier_file" | "admin_declaration";
  evidence_sha256: string | null;
  reason: string;
  contract_verified: true;
  supplier_fee_covered: true;
  certificate_type: string | null;
  certificate_type_evidence_sha256: string | null;
  certificate_type_verified: true | null;
};

export const listRegistryArispTariffs = (accountId: string, cursor?: string) =>
  request<RegistryArispTariffPage>(
    `/v1/team/registry-certificate-tariffs/arisp-api?account_id=${encodeURIComponent(accountId)}&limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const publishRegistryArispTariff = (
  body: RegistryArispTariffCreate,
  csrfToken: string,
) =>
  request<RegistryArispTariff>(
    "/v1/team/registry-certificate-tariffs/arisp-api",
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );
