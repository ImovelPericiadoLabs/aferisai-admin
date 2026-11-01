import { request } from "./api-core";

export type AnalysisProviderKind =
  | "vertex_service_account"
  | "gemini_api_key"
  | "openai_api_key"
  | "openai_compatible";

export type AnalysisProviderLimits = {
  max_concurrent: number;
  daily_limit: number;
  rpm: number;
  tpm: number;
  daily_cost_cents: number;
  priority: number;
};

export type AnalysisProviderAccount = AnalysisProviderLimits & {
  id: string;
  label: string;
  kind: AnalysisProviderKind;
  model: string;
  location: string;
  pool_key: string;
  execution_profile_sha256: string | null;
  credential_hint: string;
  base_url: string | null;
  status: "draft" | "active" | "suspended";
  version: number;
  created_at: string;
  updated_at: string;
};

export type AnalysisProviderAccountPage = {
  items: AnalysisProviderAccount[];
  next_cursor: string | null;
};

export type CreateAnalysisProviderAccount = AnalysisProviderLimits & {
  label: string;
  kind: AnalysisProviderKind;
  model: string;
  location: string;
  pool_key: string;
  base_url: string | null;
  secret: string;
  reason: string;
};

export const listAnalysisProviderAccounts = (cursor?: string) =>
  request<AnalysisProviderAccountPage>(
    `/v1/team/analysis-provider-accounts?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const createAnalysisProviderAccount = (
  body: CreateAnalysisProviderAccount,
  csrfToken: string,
) =>
  request<AnalysisProviderAccount>("/v1/team/analysis-provider-accounts", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const updateAnalysisProviderLimits = (
  id: string,
  limits: AnalysisProviderLimits,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) =>
  request<AnalysisProviderAccount>(
    `/v1/team/analysis-provider-accounts/${encodeURIComponent(id)}/limits`,
    {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({
        ...limits,
        expected_version: expectedVersion,
        reason,
      }),
    },
  );

export type ActivateProviderBody = {
  expected_version: number;
  model: string;
  expected_profile_sha256: string;
  external_reserved: number;
  reason: string;
};

export type ProviderActivationPreview = {
  model: string;
  execution_profile_sha256: string;
  credential_checked: boolean;
  pool_key: string;
};

export const previewAnalysisProviderActivation = (id: string) =>
  request<ProviderActivationPreview>(
    `/v1/team/analysis-provider-accounts/${encodeURIComponent(id)}/activation-preview`,
    {},
  );

export const activateAnalysisProviderAccount = (
  id: string,
  body: ActivateProviderBody,
  csrfToken: string,
) =>
  request<AnalysisProviderAccount>(
    `/v1/team/analysis-provider-accounts/${encodeURIComponent(id)}/activate`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

export const suspendAnalysisProviderAccount = (
  id: string,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) =>
  request<AnalysisProviderAccount>(
    `/v1/team/analysis-provider-accounts/${encodeURIComponent(id)}/suspend`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ expected_version: expectedVersion, reason }),
    },
  );
