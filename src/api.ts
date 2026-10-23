import { changeReasonHeaders } from "./reason";
export type LoginBody = { email: string; password: string; otp: string };
export type SessionResult = { csrf_token: string; expires_in: number };
export type CsrfResult = { csrf_token: string };
export type PasskeyOptions = {
  challenge_id: string;
  public_key: Record<string, unknown>;
};
export type PasskeyItem = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};
export type PasskeyList = { items: PasskeyItem[] };
export type TeamMember = {
  id: string;
  email: string;
  role: "administrator" | "manager" | "viewer" | "financial";
};
export type PartnerRole = "owner" | "developer" | "financial_reader";
export type PartnerMember = {
  id: string;
  email: string;
  organization_id: string | null;
  organization_name: string | null;
  organization_slug?: string | null;
  /** Relative path of the private logo (needs the partner session cookie). */
  organization_logo_url?: string | null;
  role?: PartnerRole | null;
};
export type PartnerOrganization = {
  id: string;
  name: string;
  active: boolean;
  slug?: string;
  logo_url?: string | null;
};
export type PartnerOrganizationList = {
  items: PartnerOrganization[];
  next_cursor: string | null;
};
export type PartnerApplication = { id: string; name: string; status: string };
export type PartnerApplicationList = {
  items: PartnerApplication[];
  next_cursor: string | null;
};
export type PartnerInvitationIssued = {
  invitation_id: string;
  expires_in: number;
};
export type PartnerEnrollment = { totp_secret: string; otpauth_uri: string };
export type TeamInvitationEnrollment = {
  totp_secret: string;
  otpauth_uri: string;
};
export type OnboardingBody = {
  organization_slug: string;
  organization_name: string;
  application_name: string;
};
export type OnboardingResult = {
  organization_id: string;
  application_id: string;
  client_id: string;
  client_secret: string;
};
export type AdditionalApplication = {
  id: string;
  organization_id: string;
  name: string;
  status: string;
};
export type ApplicationBulkChanges = {
  status?: "active" | "suspended";
  grant_permissions?: string[];
  revoke_permissions?: string[];
};
export type ApplicationBulkPreview = {
  preview_id: string;
  organization_id: string;
  expires_at: string;
  confirmation_hash: string;
  selected_count: number;
  affected_count: number;
  state: "preview" | "applied";
  items: {
    application_id: string;
    name: string;
    current_status: string;
    next_status: string;
    current_permissions: string[];
    next_permissions: string[];
    can_apply: boolean;
    reason?: string | null;
  }[];
};
export type ApplicationBulkResult = {
  preview_id: string;
  organization_id: string;
  applied_at: string;
  selected_count: number;
  affected_count: number;
  items: {
    application_id: string;
    outcome: "applied" | "no_change" | "conflict" | "blocked" | "not_found";
    reason?: string | null;
  }[];
};
export type OrganizationListItem = {
  id: string;
  slug: string;
  name: string;
  status: string;
  applications_count: number;
  /** Returned by the list since backend PR #33; undefined only on older servers, where the avatar falls back to the detail. */
  logo_url?: string | null;
};
export type OrganizationList = {
  items: OrganizationListItem[];
  next_cursor: string | null;
};
export type OrganizationDetail = Omit<
  OrganizationListItem,
  "applications_count"
> & {
  /** Company root hidden; null when no CNPJ is registered. */
  cnpj_masked?: string | null;
  description: string | null;
  logo_url: string | null;
  applications: {
    id: string;
    name: string;
    status: string;
    permissions: string[];
  }[];
  permissions: { code: string; description: string }[];
};
export type OrganizationProfile = Pick<
  OrganizationDetail,
  "id" | "slug" | "name" | "description" | "status"
>;
export type PartnerCredential = {
  id: string;
  client_id: string;
  status: "active" | "revoked";
  created_at: string;
  revoked_at: string | null;
  issue_request_id: string | null;
  name?: string | null;
  expires_at?: string | null;
  scopes?: string[];
};
export type CredentialList = {
  items: PartnerCredential[];
  next_cursor: string | null;
};
export type IssuedPartnerCredential = PartnerCredential & {
  client_secret: string;
};
export type ReviewCitation = {
  kind: string;
  value: string;
  page: number;
  status: "text_found" | "text_missing" | "no_text_layer" | "page_missing";
};
export type ReviewPacket = {
  work_id: string;
  request_id: string;
  expires_at: string;
  latest_decision_id: string | null;
  latest_outcome: "approved" | "inconclusive" | null;
  flags: string[];
  findings: {
    registry_identifiers: {
      registration_numbers: { value: string; page: number }[];
      registry_offices: { value: string; page: number }[];
      municipalities: { value: string; page: number }[];
    };
    persons_mentioned: {
      name: string;
      page: number;
      ownership_form: "full" | "bare" | "unspecified";
    }[];
    burdens_mentioned: {
      penhora: { excerpt: string; page: number }[];
      hipoteca: { excerpt: string; page: number }[];
    };
    acts_cited: {
      page: number;
      kind: string;
      excerpt: string;
      entry_label: string | null;
      refers_to_entry: string | null;
    }[];
  };
  citation_checks: ReviewCitation[];
};
export type PendingReviewPage = {
  items: {
    work_id: string;
    request_id: string;
    completed_at: string;
    expires_at: string;
  }[];
  next_cursor: string | null;
};
export type AttentionPage = {
  items: {
    work_id: string;
    request_id: string;
    status: "failed" | "unknown" | "suspended" | "completed";
    error_code: string;
    finished_at: string | null;
  }[];
  next_cursor: string | null;
};
export type ExceptionAffectedItem = {
  ordinal: number;
  work_id: string | null;
  work_status: string | null;
  error_code: string | null;
  /** Only present once the backend exposes it; lets the original be opened directly. */
  request_id?: string | null;
};
export type PaymentExceptionCase = {
  id: string;
  work_id: string;
  request_id?: string | null;
  opened_at: string;
  due_at: string;
  reason_code: string;
  amount_cents: number;
  latest_proposal_id: string | null;
  proposed_resolution: "correct" | "refund" | null;
  proposal_reason: string | null;
  proposal_actor_id: string | null;
  proposal_at: string | null;
  resolution: "correct" | "refund" | null;
  financial_decision_id: string | null;
  manager_assignee_id: string | null;
  financial_assignee_id: string | null;
  execution_status: "attempted" | "pending" | "done" | "unknown" | null;
  /** Documents of the same registry purchase; empty for uploaded-file cases. */
  affected_items?: ExceptionAffectedItem[];
};
export type PaymentExceptionPage = {
  items: PaymentExceptionCase[];
  next_cursor: string | null;
};
export type CitationVisualReview = {
  citation_index: number;
  page: number;
  box: [number, number, number, number];
  reason: string;
};
export type ReviewDecisionBody = {
  outcome: "approved" | "inconclusive";
  source_kind: "registry_record" | "third_party_report" | "unverified";
  reason: string;
  acknowledged_flags: string[];
  citation_reviews: CitationVisualReview[];
  supersedes_decision_id: string | null;
};
export type SourceKind =
  "registry_record" | "third_party_report" | "unverified";
export type SourceDecision = {
  id: string;
  source_kind: SourceKind;
  reason: string;
  revision: number;
  created_at: string;
};
export type LatestSourceDecision = { decision: SourceDecision | null };
export type PendingSourcePage = {
  items: {
    request_id: string;
    created_at: string;
    expires_at: string;
  }[];
  next_cursor: string | null;
};
export type RequestOperationPage = {
  items: {
    request_id: string;
    created_at: string;
    page_count: number;
    document_state: "available" | "expired" | "purged";
    admission_outcome: string | null;
    payment_status: string | null;
    charge_attempt: string | null;
    work_id: string | null;
    work_status: string | null;
  }[];
  next_cursor: string | null;
};
export type SourceDecisionBody = {
  source_kind: SourceKind;
  reason: string;
  supersedes_decision_id: string | null;
};
export type CommercialPolicy = {
  id: string;
  organization_id: string | null;
  application_id: string | null;
  channel: "site" | "integration" | "promotion";
  source: "number" | "cnm" | "address" | "upload";
  item_code: string;
  attribution: "public" | "connected" | "coupon" | "link";
  valid_from: string;
  valid_until: string;
  discount_fixed_cents: number;
  discount_rate_bps: number;
  commission_fixed_cents: number;
  commission_rate_bps: number;
  status: "draft" | "published" | "suspended";
  published_at: string | null;
  suspended_at: string | null;
};
export type CommercialPolicyPage = {
  items: CommercialPolicy[];
  next_cursor: string | null;
};
export type CommercialPolicyDraft = Omit<
  CommercialPolicy,
  "id" | "status" | "published_at" | "suspended_at"
> & { reason: string };

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

type Problem = { status?: number; code?: string; detail?: string };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const base = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);

async function responseError(response: Response): Promise<ApiError> {
  let problem: Problem = {};
  try {
    problem = (await response.json()) as Problem;
  } catch {
    problem = {};
  }
  return new ApiError(
    response.status,
    problem.code || "REQUEST_FAILED",
    problem.detail || "Não foi possível concluir a solicitação.",
  );
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw await responseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

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

export const listCommercialPolicies = (
  cursor?: string,
  filters?: {
    channel?: CommercialPolicy["channel"];
    status?: CommercialPolicy["status"];
  },
) => {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  if (filters?.channel) params.set("channel", filters.channel);
  if (filters?.status) params.set("status", filters.status);
  return request<CommercialPolicyPage>(
    `/v1/team/commercial-policies?${params}`,
    {
      method: "GET",
    },
  );
};

export const createCommercialPolicyDraft = (
  body: CommercialPolicyDraft,
  csrfToken: string,
) =>
  request<CommercialPolicy>("/v1/team/commercial-policies", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const decideCommercialPolicy = (
  id: string,
  action: "publish" | "suspend",
  reason: string,
  csrfToken: string,
) =>
  request<CommercialPolicy>(
    `/v1/team/commercial-policies/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason }),
    },
  );

export type CommercialPolicyPreview = {
  policy_version_id: string;
  policy_status: string;
  base_price_cents: number;
  item_count: number;
  discount_fixed_cents: number;
  discount_rate_cents: number;
  discount_cents: number;
  commission_fixed_cents: number;
  commission_rate_cents: number;
  commission_cents: number;
  payable_cents: number;
  ineligible_reason: string | null;
};

export const updateCommercialPolicyDraft = (
  id: string,
  body: CommercialPolicyDraft,
  csrfToken: string,
) =>
  request<CommercialPolicy>(
    `/v1/team/commercial-policies/${encodeURIComponent(id)}/draft`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

export const previewCommercialPolicy = (
  id: string,
  basePriceCents: number,
  itemCount: number,
  csrfToken: string,
) =>
  request<CommercialPolicyPreview>(
    `/v1/team/commercial-policies/${encodeURIComponent(id)}/preview`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({
        base_price_cents: basePriceCents,
        item_count: itemCount,
      }),
    },
  );

export type PromotionAsset = {
  id: string;
  policy_version_id: string;
  organization_id: string;
  kind: string;
  public_label: string | null;
  valid_from: string;
  valid_until: string;
  use_limit: number | null;
  use_count: number;
  status: string;
  suspended_at: string | null;
  created_at: string;
};
export type PromotionCreateResult = PromotionAsset & { plain_code: string };
export type PromotionPage = {
  items: PromotionAsset[];
  next_cursor: string | null;
};
export type CreatePromotionBody = {
  policy_version_id: string;
  organization_id: string;
  kind: "coupon" | "link";
  valid_from: string;
  valid_until: string;
  public_label: string | null;
  use_limit: number | null;
};

export const listPromotions = (cursor?: string, organization_id?: string) =>
  request<PromotionPage>(
    `/v1/team/promotions?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${organization_id ? `&organization_id=${encodeURIComponent(organization_id)}` : ""}`,
    { method: "GET" },
  );

export const createPromotion = (body: CreatePromotionBody, csrfToken: string) =>
  request<PromotionCreateResult>("/v1/team/promotions", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const suspendPromotion = (assetId: string, csrfToken: string) =>
  request<PromotionAsset>(
    `/v1/team/promotions/${encodeURIComponent(assetId)}/suspend`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({}),
    },
  );

export type CommissionEntry = {
  id: string;
  payment_intent_id: string;
  policy_version_id: string;
  beneficiary_organization_id: string;
  item_kind: string;
  amount_cents: number;
  status: "provisional" | "owed" | "settled" | "reversed";
  idempotency_key: string;
  settlement_id: string | null;
  created_at: string;
};
export type CommissionEntryPage = {
  items: CommissionEntry[];
  next_cursor: string | null;
};
export type CommissionSettlement = {
  id: string;
  beneficiary_organization_id: string;
  external_reference: string;
  amount_cents: number;
  evidence_note: string;
  settled_at: string;
  created_at: string;
};
export type CommissionSettlementPage = {
  items: CommissionSettlement[];
  next_cursor: string | null;
};
export type CreateSettlementBody = {
  beneficiary_organization_id: string;
  external_reference: string;
  amount_cents: number;
  evidence_note: string;
  settled_at: string;
  entry_ids: string[];
};

export const listCommissionEntries = (
  cursor?: string,
  beneficiary_organization_id?: string,
  status?: string,
) =>
  request<CommissionEntryPage>(
    `/v1/team/commissions?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${beneficiary_organization_id ? `&beneficiary_organization_id=${encodeURIComponent(beneficiary_organization_id)}` : ""}${status ? `&status=${encodeURIComponent(status)}` : ""}`,
    { method: "GET" },
  );

export const listCommissionSettlements = (
  cursor?: string,
  beneficiary_organization_id?: string,
) =>
  request<CommissionSettlementPage>(
    `/v1/team/commission-settlements?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${beneficiary_organization_id ? `&beneficiary_organization_id=${encodeURIComponent(beneficiary_organization_id)}` : ""}`,
    { method: "GET" },
  );

export const createCommissionSettlement = (
  body: CreateSettlementBody,
  csrfToken: string,
) =>
  request<CommissionSettlement>("/v1/team/commission-settlements", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const reverseCommissionEntry = (
  entryId: string,
  reason: string,
  csrfToken: string,
) =>
  request<CommissionEntry>(
    `/v1/team/commissions/${encodeURIComponent(entryId)}/reverse`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason }),
    },
  );

export const getAnalysisReview = (workId: string) =>
  request<ReviewPacket>(
    `/v1/team/analysis-works/${encodeURIComponent(workId)}/review`,
    { method: "GET" },
  );

export const getLatestSourceDecision = (requestId: string) =>
  request<LatestSourceDecision>(
    `/v1/team/analysis-requests/${encodeURIComponent(requestId)}/source-decisions/latest`,
    { method: "GET" },
  );

export const listPendingSourceClassifications = (cursor?: string) =>
  request<PendingSourcePage>(
    `/v1/team/analysis-requests/pending-source-classifications?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const listTeamAnalysisRequests = (cursor?: string) =>
  request<RequestOperationPage>(
    `/v1/team/analysis-requests?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const createAdditionalApplication = (
  organizationId: string,
  applicationId: string,
  name: string,
  csrfToken: string,
) =>
  request<AdditionalApplication>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/applications/${encodeURIComponent(applicationId)}`,
    {
      method: "PUT",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    },
  );

export const previewApplicationBulkChange = (
  organizationId: string,
  applicationIds: string[],
  changes: ApplicationBulkChanges,
  csrfToken: string,
  idempotencyKey: string,
) =>
  request<ApplicationBulkPreview>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/applications/bulk-previews`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken, "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ application_ids: applicationIds, changes }),
    },
  );

export const applyApplicationBulkChange = (
  organizationId: string,
  previewId: string,
  confirmationHash: string,
  csrfToken: string,
) =>
  request<ApplicationBulkResult>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/applications/bulk-previews/${encodeURIComponent(previewId)}/apply`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ confirmation_hash: confirmationHash }),
    },
  );

export const classifyAnalysisOriginal = (
  requestId: string,
  body: SourceDecisionBody,
  csrfToken: string,
) =>
  request<{ id: string }>(
    `/v1/team/analysis-requests/${encodeURIComponent(requestId)}/source-decisions`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

export const listPendingReviews = (cursor?: string) =>
  request<PendingReviewPage>(
    `/v1/team/analysis-works/pending-reviews?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const listAnalysisAttention = (cursor?: string) =>
  request<AttentionPage>(
    `/v1/team/analysis-works/attention?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const listPaymentExceptions = (cursor?: string) =>
  request<PaymentExceptionPage>(
    `/v1/team/payment-exceptions?limit=20${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const claimPaymentException = (caseId: string, csrfToken: string) =>
  request<{ member_id: string }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/claims`,
    { method: "POST", headers: { "X-CSRF-Token": csrfToken } },
  );

export const reassignPaymentException = (
  caseId: string,
  role: "manager" | "financial",
  memberId: string,
  reason: string,
  csrfToken: string,
) =>
  request<{ member_id: string }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/reassignments`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ role, member_id: memberId, reason }),
    },
  );

export const proposePaymentException = (
  caseId: string,
  resolution: "correct" | "refund",
  reason: string,
  csrfToken: string,
) =>
  request<{ id: string }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/proposals`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ resolution, reason }),
    },
  );

export const confirmPaymentException = (
  caseId: string,
  proposalId: string,
  reason: string,
  csrfToken: string,
) =>
  request<{ id: string }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/confirmations`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ proposal_id: proposalId, reason }),
    },
  );

export const executePaymentException = (
  caseId: string,
  action:
    "refund-attempts" | "refund-reconciliations" | "correction-verifications",
  csrfToken: string,
) =>
  request<{ id: string; status: "attempted" | "pending" | "done" | "unknown" }>(
    `/v1/team/payment-exceptions/${encodeURIComponent(caseId)}/${action}`,
    { method: "POST", headers: { "X-CSRF-Token": csrfToken } },
  );

export const decideAnalysisReview = (
  workId: string,
  body: ReviewDecisionBody,
  csrfToken: string,
) =>
  request<{ id: string }>(
    `/v1/team/analysis-works/${encodeURIComponent(workId)}/review-decisions`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

export async function openAnalysisOriginal(
  requestId: string,
  reason: string,
  csrfToken: string,
): Promise<Blob> {
  const response = await fetch(
    `${base}/v1/team/analysis-requests/${encodeURIComponent(requestId)}/original-accesses`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ reason }),
    },
  );
  if (!response.ok) throw await responseError(response);
  return response.blob();
}

export const createSession = (body: LoginBody) =>
  request<SessionResult>("/v1/team/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
export const beginPasskeyLogin = (email: string) =>
  request<PasskeyOptions>("/v1/team/passkeys/authentication/options", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
export const finishPasskeyLogin = (
  email: string,
  challengeId: string,
  credential: Record<string, unknown>,
) =>
  request<SessionResult>("/v1/team/passkeys/authentication/confirm", {
    method: "POST",
    body: JSON.stringify({ email, challenge_id: challengeId, credential }),
  });
export const listPasskeys = () =>
  request<PasskeyList>("/v1/team/passkeys", { method: "GET" });
export const beginPasskeyRegistration = (csrfToken: string) =>
  request<PasskeyOptions>("/v1/team/passkeys/registration/options", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
export const finishPasskeyRegistration = (
  challengeId: string,
  credential: Record<string, unknown>,
  label: string,
  csrfToken: string,
) =>
  request<PasskeyItem>("/v1/team/passkeys/registration/confirm", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ challenge_id: challengeId, credential, label }),
  });
export const revokePasskey = (id: string, csrfToken: string) =>
  request<void>(`/v1/team/passkeys/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
export const renewCsrf = () =>
  request<CsrfResult>("/v1/team/sessions/current/csrf", { method: "POST" });
export const currentMember = () =>
  request<TeamMember>("/v1/team/sessions/current", { method: "GET" });
export const deleteSession = (csrfToken: string) =>
  request<void>("/v1/team/sessions/current", {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
export const createPartnerSession = (body: LoginBody) =>
  request<SessionResult>("/v1/partner/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
export const currentPartnerMember = () =>
  request<PartnerMember>("/v1/partner/sessions/current", { method: "GET" });
export const listPartnerOrganizations = (q = "", cursor?: string) => {
  const params = new URLSearchParams({ limit: "20" });
  if (q) params.set("q", q);
  if (cursor) params.set("cursor", cursor);
  return request<PartnerOrganizationList>(
    `/v1/partner/organizations?${params}`,
    {
      method: "GET",
    },
  );
};
export const switchPartnerOrganization = (
  organizationId: string,
  csrfToken: string,
) =>
  request<PartnerMember>("/v1/partner/sessions/current/organization", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ organization_id: organizationId }),
  });
export const acceptPartnerOrganizationInvitation = (
  token: string,
  csrfToken: string,
) =>
  request<{ organization_id: string }>("/v1/partner/invitations/accept", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ token }),
  });
export const renewPartnerCsrf = () =>
  request<CsrfResult>("/v1/partner/sessions/current/csrf", { method: "POST" });
export const deletePartnerSession = (csrfToken: string) =>
  request<void>("/v1/partner/sessions/current", {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
export const listPartnerApplications = (cursor?: string) => {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return request<PartnerApplicationList>(`/v1/partner/applications?${params}`, {
    method: "GET",
  });
};
export const listPartnerApplicationPermissions = (applicationId: string) =>
  request<{ items: { code: string; description: string }[] }>(
    `/v1/partner/applications/${encodeURIComponent(applicationId)}/permissions`,
    { method: "GET" },
  );
export const enrollPartnerInvitation = (token: string, password: string) =>
  request<PartnerEnrollment>("/v1/partner/invitations/enroll", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
export const enrollTeamInvitation = (token: string, password: string) =>
  request<TeamInvitationEnrollment>("/v1/team/members/invitations/enroll", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
export const confirmTeamInvitation = (token: string, otp: string) =>
  request<void>("/v1/team/members/invitations/confirm", {
    method: "POST",
    body: JSON.stringify({ token, otp }),
  });
export const confirmPartnerInvitation = (token: string, otp: string) =>
  request<void>("/v1/partner/invitations/confirm", {
    method: "POST",
    body: JSON.stringify({ token, otp }),
  });
export const invitePartnerMember = (
  organizationId: string,
  email: string,
  csrfToken: string,
  role?: PartnerRole,
) =>
  request<PartnerInvitationIssued>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/partner-invitations`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(role ? { email, role } : { email }),
    },
  );
export type ApplicationAuditItem = {
  id: string;
  source: "permission" | "credential" | "webhook";
  action: string;
  subject_id: string | null;
  subject_code: string | null;
  actor_team_member_id: string | null;
  actor_partner_member_id: string | null;
  actor_label?: string | null;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  created_at: string;
};
export type ApplicationAuditPage = {
  items: ApplicationAuditItem[];
  next_cursor: string | null;
};

export const listApplicationAuditEvents = (
  applicationId: string,
  cursor?: string,
) =>
  request<ApplicationAuditPage>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/audit-events?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export type PartnerInvitationStatus =
  | "delivery_unconfirmed"
  | "smtp_accepted"
  | "accepted"
  | "expired"
  | "revoked"
  | "blocked";
export type PartnerInvitationSummary = {
  id: string;
  status: PartnerInvitationStatus;
  actor_team_member_id: string | null;
  actor_partner_member_id: string | null;
  created_at: string;
  expires_at: string;
  attempted_at: string | null;
  smtp_accepted_at: string | null;
  consumed_at: string | null;
  revoked_at: string | null;
  confirmation_blocked_at: string | null;
};
export type PartnerPerson = {
  id: string;
  membership_id: string;
  email: string;
  identity_status: string;
  membership_status: string;
  role: PartnerRole;
  last_access_at: string | null;
  invitation: PartnerInvitationSummary | null;
};
export type PartnerPeoplePage = {
  items: PartnerPerson[];
  next_cursor: string | null;
};
export type PartnerManagementEvent = {
  id: string;
  action: string;
  invitation_id: string | null;
  actor_team_member_id: string | null;
  actor_partner_member_id: string | null;
  previous_value: string | null;
  new_value: string | null;
  reason: string;
  created_at: string;
};
export type PartnerManagementEventPage = {
  items: PartnerManagementEvent[];
  next_cursor: string | null;
};

const partnerPeoplePath = (organizationId: string) =>
  `/v1/team/organizations/${encodeURIComponent(organizationId)}`;

export const listPartnerPeople = (organizationId: string, cursor?: string) =>
  request<PartnerPeoplePage>(
    `${partnerPeoplePath(organizationId)}/partner-people?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const listPartnerPersonEvents = (
  organizationId: string,
  memberId: string,
  cursor?: string,
) =>
  request<PartnerManagementEventPage>(
    `${partnerPeoplePath(organizationId)}/partner-people/${encodeURIComponent(memberId)}/events?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

const managementPost = (
  organizationId: string,
  tail: string,
  reason: string,
  csrfToken: string,
) =>
  request<unknown>(`${partnerPeoplePath(organizationId)}/${tail}`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ reason }),
  });

export const resendPartnerInvitation = (
  organizationId: string,
  invitationId: string,
  reason: string,
  csrfToken: string,
) =>
  managementPost(
    organizationId,
    `partner-invitations/${encodeURIComponent(invitationId)}/resend`,
    reason,
    csrfToken,
  );

export const revokePartnerInvitation = (
  organizationId: string,
  invitationId: string,
  reason: string,
  csrfToken: string,
) =>
  managementPost(
    organizationId,
    `partner-invitations/${encodeURIComponent(invitationId)}/revoke`,
    reason,
    csrfToken,
  );

export const suspendPartnerPerson = (
  organizationId: string,
  memberId: string,
  reason: string,
  csrfToken: string,
) =>
  managementPost(
    organizationId,
    `partner-people/${encodeURIComponent(memberId)}/suspend`,
    reason,
    csrfToken,
  );

export const reactivatePartnerPerson = (
  organizationId: string,
  memberId: string,
  reason: string,
  csrfToken: string,
) =>
  managementPost(
    organizationId,
    `partner-people/${encodeURIComponent(memberId)}/reactivate`,
    reason,
    csrfToken,
  );

export const changePartnerPersonRole = (
  organizationId: string,
  memberId: string,
  role: PartnerRole,
  reason: string,
  csrfToken: string,
) =>
  request<{ member_id: string; organization_id: string; role: PartnerRole }>(
    `${partnerPeoplePath(organizationId)}/partner-people/${encodeURIComponent(memberId)}/role`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ role, reason }),
    },
  );

/** People management as seen by a partner owner: the organization comes from the session. */
const ownPeoplePath = "/v1/partner/people";
const ownPost = (path: string, body: unknown, csrfToken: string) =>
  request<unknown>(path, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export type PeopleApi = {
  list: (cursor?: string) => Promise<PartnerPeoplePage>;
  events: (
    memberId: string,
    cursor?: string,
  ) => Promise<PartnerManagementEventPage>;
  invite: (email: string, role: PartnerRole) => Promise<unknown>;
  resend: (invitationId: string, reason: string) => Promise<unknown>;
  revoke: (invitationId: string, reason: string) => Promise<unknown>;
  suspend: (memberId: string, reason: string) => Promise<unknown>;
  reactivate: (memberId: string, reason: string) => Promise<unknown>;
  changeRole: (
    memberId: string,
    role: PartnerRole,
    reason: string,
  ) => Promise<unknown>;
};

const cursorQuery = (cursor?: string) =>
  `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;

export const teamPeopleApi = (
  organizationId: string,
  csrfToken: string,
): PeopleApi => ({
  list: (cursor) => listPartnerPeople(organizationId, cursor),
  events: (memberId, cursor) =>
    listPartnerPersonEvents(organizationId, memberId, cursor),
  invite: (email, role) =>
    invitePartnerMember(organizationId, email, csrfToken, role),
  resend: (id, reason) =>
    resendPartnerInvitation(organizationId, id, reason, csrfToken),
  revoke: (id, reason) =>
    revokePartnerInvitation(organizationId, id, reason, csrfToken),
  suspend: (id, reason) =>
    suspendPartnerPerson(organizationId, id, reason, csrfToken),
  reactivate: (id, reason) =>
    reactivatePartnerPerson(organizationId, id, reason, csrfToken),
  changeRole: (id, role, reason) =>
    changePartnerPersonRole(organizationId, id, role, reason, csrfToken),
});

export const ownerPeopleApi = (csrfToken: string): PeopleApi => ({
  list: (cursor) =>
    request<PartnerPeoplePage>(`${ownPeoplePath}?${cursorQuery(cursor)}`, {
      method: "GET",
    }),
  events: (memberId, cursor) =>
    request<PartnerManagementEventPage>(
      `${ownPeoplePath}/${encodeURIComponent(memberId)}/events?${cursorQuery(cursor)}`,
      { method: "GET" },
    ),
  invite: (email, role) =>
    ownPost(
      "/v1/partner/invitations",
      { email, role, reason: "Convite enviado pelo proprietário da parceria" },
      csrfToken,
    ),
  resend: (id, reason) =>
    ownPost(
      `/v1/partner/invitations/${encodeURIComponent(id)}/resend`,
      { reason },
      csrfToken,
    ),
  revoke: (id, reason) =>
    ownPost(
      `/v1/partner/invitations/${encodeURIComponent(id)}/revoke`,
      { reason },
      csrfToken,
    ),
  suspend: (id, reason) =>
    ownPost(
      `${ownPeoplePath}/${encodeURIComponent(id)}/suspend`,
      { reason },
      csrfToken,
    ),
  reactivate: (id, reason) =>
    ownPost(
      `${ownPeoplePath}/${encodeURIComponent(id)}/reactivate`,
      { reason },
      csrfToken,
    ),
  changeRole: (id, role, reason) =>
    request<unknown>(`${ownPeoplePath}/${encodeURIComponent(id)}/role`, {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ role, reason }),
    }),
});

export const createOrganization = (body: OnboardingBody, csrfToken: string) =>
  request<OnboardingResult>("/v1/team/organizations", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
export function listOrganizations(
  query = "",
  cursor?: string,
  status?: "active" | "suspended",
): Promise<OrganizationList> {
  const params = new URLSearchParams({ limit: "20" });
  if (query.trim()) params.set("q", query.trim());
  if (cursor) params.set("cursor", cursor);
  if (status) params.set("status", status);
  return request<OrganizationList>(`/v1/team/organizations?${params}`, {
    method: "GET",
  });
}

export const getOrganization = (organizationId: string) =>
  request<OrganizationDetail>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}`,
    { method: "GET" },
  );

export const replaceOrganizationProfile = (
  organizationId: string,
  body: { name: string; description: string | null },
  csrfToken: string,
) =>
  request<OrganizationProfile>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/profile`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

export const describeOrganizationPermission = (
  organizationId: string,
  code: string,
  description: string,
  csrfToken: string,
) =>
  request<{ code: string; description: string }>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/permissions/${encodeURIComponent(code)}`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ description }),
    },
  );

export const registerOrganizationPermission = (
  organizationId: string,
  code: string,
  description: string,
  csrfToken: string,
) =>
  request<{ code: string; description: string }>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/permissions`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ code, description }),
    },
  );

export const grantApplicationPermission = (
  applicationId: string,
  code: string,
  csrfToken: string,
  reason?: string,
) =>
  request<{ application_id: string; code: string; granted: boolean }>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/permissions/${encodeURIComponent(code)}`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );

export const revokeApplicationPermission = (
  applicationId: string,
  code: string,
  csrfToken: string,
  reason?: string,
) =>
  request<void>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/permissions/${encodeURIComponent(code)}`,
    {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );

export type RedirectUriRegistry = {
  application_id: string;
  redirect_uris: string[];
  version: number;
};

export const getApplicationRedirectUris = (applicationId: string) =>
  request<RedirectUriRegistry>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/redirect-uris`,
    { method: "GET" },
  );

export const replaceApplicationRedirectUris = (
  applicationId: string,
  redirectUris: string[],
  expectedVersion: number,
  csrfToken: string,
) =>
  request<RedirectUriRegistry>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/redirect-uris`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        redirect_uris: redirectUris,
        expected_version: expectedVersion,
      }),
    },
  );

export function listPartnerCredentials(
  applicationId: string,
  cursor?: string,
  channel: "team" | "partner" = "team",
): Promise<CredentialList> {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return request<CredentialList>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/credentials?${params}`,
    { method: "GET" },
  );
}

export const issuePartnerCredential = (
  applicationId: string,
  issueRequestId: string,
  csrfToken: string,
  options: { name: string; expires_in_days: number; scopes: string[] },
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<IssuedPartnerCredential>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/credentials`,
    {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Idempotency-Key": issueRequestId,
        ...changeReasonHeaders(reason),
      },
      body: JSON.stringify(options),
    },
  );

export const revokePartnerCredential = (
  applicationId: string,
  credentialId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<void>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/credentials/${encodeURIComponent(credentialId)}`,
    {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );

export const putOrganizationLogo = (
  organizationId: string,
  file: File,
  csrfToken: string,
) =>
  request<{ logo_url: string; width: number; height: number }>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/logo`,
    {
      method: "PUT",
      headers: { "Content-Type": file.type, "X-CSRF-Token": csrfToken },
      body: file,
    },
  );

export function uploadWithProgress<T>(
  path: string,
  file: Blob,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${base}${path}`);
    xhr.withCredentials = true;
    for (const [name, value] of Object.entries(headers))
      xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let body: unknown;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        body = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      const problem = (body ?? {}) as Problem;
      reject(
        new ApiError(
          xhr.status,
          problem.code || "REQUEST_FAILED",
          problem.detail || "Não foi possível concluir a solicitação.",
        ),
      );
    };
    xhr.onerror = () =>
      reject(
        new ApiError(0, "NETWORK_ERROR", "Falha de rede durante o envio."),
      );
    xhr.send(file);
  });
}

export const putOrganizationLogoWithProgress = (
  organizationId: string,
  file: Blob,
  csrfToken: string,
  onProgress: (fraction: number) => void,
) =>
  uploadWithProgress<{ logo_url: string; width: number; height: number }>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/logo`,
    file,
    { "Content-Type": file.type, "X-CSRF-Token": csrfToken },
    onProgress,
  );

export const deleteOrganizationLogo = (
  organizationId: string,
  csrfToken: string,
) =>
  request<void>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/logo`,
    { method: "DELETE", headers: { "X-CSRF-Token": csrfToken } },
  );

export async function getLogoBlobUrl(relativeUrl: string): Promise<string> {
  const url = mediaUrl(relativeUrl);
  if (!url)
    throw new ApiError(
      400,
      "INVALID_MEDIA_URL",
      "Endereço de imagem inválido.",
    );
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok)
    throw new ApiError(
      response.status,
      "MEDIA_UNAVAILABLE",
      "Não foi possível carregar o logo.",
    );
  if (!response.headers.get("Content-Type")?.startsWith("image/webp"))
    throw new ApiError(
      502,
      "INVALID_MEDIA_TYPE",
      "O formato da imagem recebida é inválido.",
    );
  return URL.createObjectURL(await response.blob());
}

export function mediaUrl(relativeUrl: string | null): string | null {
  if (!relativeUrl?.startsWith("/") || relativeUrl.startsWith("//"))
    return null;
  const result = new URL(relativeUrl, base);
  return result.origin === new URL(base).origin ? result.href : null;
}

// --- Submission reconciliation (B2) ---

export type UncertainSubmissionItem = {
  item_id: string;
  operation_id: string;
  provider: string;
  created_at: string;
  attempted_at: string;
};

export type UncertainSubmissionPage = {
  items: UncertainSubmissionItem[];
  next_cursor: string | null;
};

export type ReconcileDecisionResponse = {
  item_id: string;
  decision: "no_purchase" | "protocol_confirmed";
};

export const listUncertainSubmissions = (cursor?: string) =>
  request<UncertainSubmissionPage>(
    `/v1/team/registry-submissions/uncertain?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const reconcileNoPurchase = (
  itemId: string,
  reason: string,
  csrfToken: string,
) =>
  request<ReconcileDecisionResponse>(
    `/v1/team/registry-submissions/uncertain/${encodeURIComponent(itemId)}/reconcile/no-purchase`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason }),
    },
  );

export const reconcileProtocol = (
  itemId: string,
  protocol: string,
  reason: string,
  csrfToken: string,
) =>
  request<ReconcileDecisionResponse>(
    `/v1/team/registry-submissions/uncertain/${encodeURIComponent(itemId)}/reconcile/protocol`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ protocol, reason }),
    },
  );

// --- ONR preview review (B1.2) ---

export type OnrPreviewAttentionItem = {
  attempt_id: string;
  operation_id: string;
  started_at: string;
  latest_review_id: string | null;
  latest_decision: string | null;
  review_version: number;
};

export type OnrPreviewAttentionPage = {
  items: OnrPreviewAttentionItem[];
  next_cursor: string | null;
};

export type OnrPortalOrder = {
  protocol: string;
  date: string;
  status: string;
};

export type OnrPortalOrdersInspection = {
  attempt_id: string;
  observed_at: string;
  listing_sha256: string;
  coverage: string;
  pages_read: number;
  orders: OnrPortalOrder[];
};

export type OnrPreviewReviewHistory = {
  items: {
    id: string;
    decision: string;
    reason: string;
    created_at: string;
  }[];
};

export type OnrPreviewReviewResult = { id: string };

export const listOnrPreviewAttempts = (cursor?: string) =>
  request<OnrPreviewAttentionPage>(
    `/v1/team/onr-preview-attempts?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const getOnrOrdersInspection = (attemptId: string) =>
  request<OnrPortalOrdersInspection>(
    `/v1/team/onr-preview-attempts/${encodeURIComponent(attemptId)}/orders-inspection`,
    { method: "GET" },
  );

export const getOnrPreviewReviews = (attemptId: string) =>
  request<OnrPreviewReviewHistory>(
    `/v1/team/onr-preview-attempts/${encodeURIComponent(attemptId)}/reviews`,
    { method: "GET" },
  );

export const createOnrPreviewReview = (
  attemptId: string,
  decision: string,
  reason: string,
  previousReviewId: string | null,
  expectedListingSha256: string,
  csrfToken: string,
) =>
  request<OnrPreviewReviewResult>(
    `/v1/team/onr-preview-attempts/${encodeURIComponent(attemptId)}/reviews`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({
        decision,
        reason,
        previous_review_id: previousReviewId,
        expected_listing_sha256: expectedListingSha256,
      }),
    },
  );

// ── Registry request team listing ──────────────────────────────────────────

export type TeamRegistryRequestItem = {
  id: string;
  owner_user_id: string;
  source: string;
  product: string;
  status: string;
  item_count: number;
  created_at: string;
};

export type TeamRegistryRequestPage = {
  items: TeamRegistryRequestItem[];
  next_cursor: string | null;
};

export type TeamConnection = {
  id: string;
  user_id: string;
  application_id: string;
  scopes: string[];
  grant_version: number;
  granted_at: string;
};

export type TeamConnectionPage = {
  items: TeamConnection[];
  next_cursor: string | null;
};

export type TeamMemberListItem = {
  id: string;
  email: string;
  role: "administrator" | "manager" | "viewer" | "financial";
  status: "active" | "suspended";
  created_at: string;
};

export type TeamMemberListPage = {
  items: TeamMemberListItem[];
  next_cursor: string | null;
};

export const listTeamMembers = (cursor?: string) => {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return request<TeamMemberListPage>(`/v1/team/members?${params.toString()}`, {
    method: "GET",
  });
};

export type TeamUser = {
  id: string;
  email: string;
  status: "active" | "suspended";
  created_at: string;
};

export type TeamUserPage = {
  items: TeamUser[];
  next_cursor: string | null;
};

export const listTeamUsers = (cursor?: string, status?: string) => {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  if (status) params.set("status", status);
  return request<TeamUserPage>(`/v1/team/users?${params.toString()}`, {
    method: "GET",
  });
};

export const revokeTeamConnection = (connectionId: string, csrfToken: string) =>
  request<void>(
    `/v1/team/connections/${encodeURIComponent(connectionId)}/revoke`,
    { method: "POST", headers: { "X-CSRF-Token": csrfToken } },
  );

export const listTeamConnections = (
  cursor?: string,
  application_id?: string,
) => {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  if (application_id) params.set("application_id", application_id);
  return request<TeamConnectionPage>(
    `/v1/team/connections?${params.toString()}`,
    { method: "GET" },
  );
};

export interface DashboardMetrics {
  analyses?: {
    queued: number;
    running: number;
    completed: number;
    error: number;
  };
  payments?: { prepared: number; received: number; review: number };
  registry_requests?: {
    pending: number;
    dispatched: number;
    confirmed: number;
    error: number;
  };
  commissions?: { provisional: number; owed: number; settled: number };
}

export const getDashboardMetrics = () =>
  request<DashboardMetrics>("/v1/team/dashboard", { method: "GET" });

export type DashboardDailyCount = { date: string; count: number };
export type DashboardDailySeries = {
  current: DashboardDailyCount[];
  previous?: DashboardDailyCount[];
};
export type DashboardSeriesResponse = {
  timezone: "UTC";
  start_date: string;
  end_date: string;
  compare: boolean;
  series: Partial<Record<keyof DashboardMetrics, DashboardDailySeries>>;
};

export const getDashboardSeries = (
  startDate: string,
  endDate: string,
  compare: boolean,
) => {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    compare: String(compare),
  });
  return request<DashboardSeriesResponse>(
    `/v1/team/dashboard/series?${params.toString()}`,
    {
      method: "GET",
    },
  );
};

export type WebhookEndpoint = {
  id: string;
  application_id: string;
  url: string;
  status: "draft" | "active" | "suspended";
  created_at: string;
  plain_secret: string | null;
  last_successful_test_at?: string | null;
  event_types?: string[];
  event_selection_version?: number;
  key_version?: number;
  pending_key_version?: number | null;
  pending_key_prepared_at?: string | null;
  pending_key_tested_at?: string | null;
};

export type WebhookEventCatalogItem = {
  type: string;
  version: number;
  subscribable: boolean;
  json_schema: Record<string, unknown>;
  example: Record<string, unknown>;
};

export type WebhookDelivery = {
  id: string;
  event_type: string;
  status: "pending" | "delivered" | "attempted" | "unknown" | "skipped";
  endpoint_url: string;
  http_status: number | null;
  duration_ms: number | null;
  created_at: string;
  attempted_at: string | null;
  is_test: boolean;
  simulated_event_type?: string | null;
  test_payload?: Record<string, unknown> | null;
};
export type WebhookTestResult = WebhookDelivery;
export type WebhookDeliveryList = {
  items: WebhookDelivery[];
  next_cursor: string | null;
};

export const testApplicationWebhookEndpoint = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  eventType?: string,
) =>
  request<WebhookTestResult>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint/test`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      ...(eventType ? { body: JSON.stringify({ event_type: eventType }) } : {}),
    },
  );

const webhookPath = (applicationId: string, channel: "team" | "partner") =>
  `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`;

export const listWebhookEventCatalog = (channel: "team" | "partner" = "team") =>
  request<WebhookEventCatalogItem[]>(`/v1/${channel}/webhook-events`, {
    method: "GET",
  });

export const selectWebhookEvents = (
  applicationId: string,
  eventTypes: string[],
  expectedVersion: number,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<WebhookEndpoint>(`${webhookPath(applicationId, channel)}/events`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    body: JSON.stringify({
      event_types: eventTypes,
      expected_version: expectedVersion,
    }),
  });

export const prepareWebhookKey = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<WebhookEndpoint>(
    `${webhookPath(applicationId, channel)}/key-rotation`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );

export const testWebhookKey = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookTestResult>(
    `${webhookPath(applicationId, channel)}/key-rotation/test`,
    { method: "POST", headers: { "X-CSRF-Token": csrfToken } },
  );

export const activateWebhookKey = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<WebhookEndpoint>(
    `${webhookPath(applicationId, channel)}/key-rotation/activate`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );

export const resendWebhookDelivery = (
  applicationId: string,
  deliveryId: string,
  reason: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookDelivery>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-deliveries/${encodeURIComponent(deliveryId)}/resend`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason: reason.trim() }),
    },
  );

export const listApplicationWebhookDeliveries = (
  applicationId: string,
  options: { before?: string; status?: string } = {},
  channel: "team" | "partner" = "team",
) => {
  const query = new URLSearchParams({ limit: "20" });
  if (options.before) query.set("before", options.before);
  if (options.status) query.set("status", options.status);
  return request<WebhookDeliveryList>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-deliveries?${query}`,
    { method: "GET" },
  );
};

export const getApplicationWebhookDelivery = (
  applicationId: string,
  deliveryId: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookDelivery>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-deliveries/${encodeURIComponent(deliveryId)}`,
    { method: "GET" },
  );

export const getApplicationWebhookEndpoint = (
  applicationId: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookEndpoint>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
    { method: "GET" },
  );

export const registerApplicationWebhookEndpoint = (
  applicationId: string,
  url: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookEndpoint>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ url }),
    },
  );

export const updateApplicationWebhookEndpointStatus = (
  applicationId: string,
  status: "active" | "suspended",
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<WebhookEndpoint>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint/status`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
      body: JSON.stringify({ status }),
    },
  );

export const deleteApplicationWebhookEndpoint = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<void>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
    {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );

export const listTeamRegistryRequests = ({
  cursor,
  status,
  source,
}: {
  cursor?: string;
  status?: string;
  source?: string;
}) => {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  const qs = params.toString();
  return request<TeamRegistryRequestPage>(
    `/v1/team/registry-requests${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
};

export type PartnerActivity = {
  organization_id: string;
  application_id: string | null;
  since: string;
  until: string;
  active_connections: number;
  analysis_submissions: number;
  analysis_completions: number;
  registry_requests: number;
  webhook_attempts: number;
  webhook_delivered: number;
  webhook_latency_p50_ms: number | null;
  webhook_latency_p95_ms: number | null;
  coupon_redemptions: number;
  link_redemptions: number;
};

export const getPartnerMetrics = (days: number, applicationId?: string) =>
  request<PartnerActivity>(
    `${applicationId ? `/v1/partner/applications/${encodeURIComponent(applicationId)}/metrics` : "/v1/partner/metrics"}?days=${days}`,
    { method: "GET" },
  );

export type PartnerCommissionItem = {
  id: string;
  item_kind: string;
  amount_cents: number;
  status: string;
  created_at: string;
  settled_at: string | null;
};
export type PartnerCommissionStatement = {
  organization_id: string;
  totals: {
    provisional_cents: number;
    owed_cents: number;
    settled_cents: number;
    reversed_cents: number;
  };
  items: PartnerCommissionItem[];
  next_cursor: string | null;
};

export const getPartnerCommissions = (cursor?: string) =>
  request<PartnerCommissionStatement>(
    `/v1/partner/commissions?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export type RegistrySupplierKind = "onr" | "infosimples";
export type RegistrySupplierAccount = {
  id: string;
  label: string;
  provider: RegistrySupplierKind;
  /** Digest that links orders and costs to the account; not a credential. */
  account_binding_sha256: string;
  credential_hint: string;
  status: "draft" | "active" | "suspended";
  version: number;
  created_at: string;
  updated_at: string;
};
export type RegistrySupplierPage = {
  items: RegistrySupplierAccount[];
  next_cursor: string | null;
};
export type RegistrySupplierCreate = {
  label: string;
  provider: RegistrySupplierKind;
  email: string;
  password: string;
  token: string | null;
  portal_account_sha256: string | null;
  reason: string;
};

export const listRegistrySupplierAccounts = (cursor?: string) =>
  request<RegistrySupplierPage>(
    `/v1/team/registry-supplier-accounts?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const createRegistrySupplierAccount = (
  body: RegistrySupplierCreate,
  csrfToken: string,
) =>
  request<RegistrySupplierAccount>("/v1/team/registry-supplier-accounts", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

const supplierDecision = (
  id: string,
  action: "activate" | "suspend",
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) =>
  request<RegistrySupplierAccount>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ expected_version: expectedVersion, reason }),
    },
  );

export const activateRegistrySupplierAccount = (
  id: string,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) => supplierDecision(id, "activate", expectedVersion, reason, csrfToken);

export const suspendRegistrySupplierAccount = (
  id: string,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) => supplierDecision(id, "suspend", expectedVersion, reason, csrfToken);

export type OnrEndpoint = {
  origin: string;
  mode: "official" | "proxy";
  proxy_key_configured: boolean;
  version: number;
};

export const getOnrEndpoint = (accountId: string) =>
  request<OnrEndpoint>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/onr-endpoint`,
    { method: "GET" },
  );

export const setOnrEndpoint = (
  accountId: string,
  origin: string,
  proxyKey: string | null,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) =>
  request<OnrEndpoint>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/onr-endpoint`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({
        origin,
        ...(proxyKey ? { proxy_key: proxyKey } : {}),
        expected_version: expectedVersion,
        reason,
      }),
    },
  );

export const resetOnrEndpoint = (
  accountId: string,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) =>
  request<OnrEndpoint>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/onr-endpoint/reset`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ expected_version: expectedVersion, reason }),
    },
  );

export type ManagementEvent = {
  id: string;
  actor_team_member_id: string;
  action: string;
  previous_value?: string | null;
  new_value?: string | null;
  reason: string;
  created_at: string;
};
export type ManagementEventPage = {
  items: ManagementEvent[];
  next_cursor: string | null;
};
export type TeamRoleName = "administrator" | "manager" | "financial" | "viewer";

const eventsQuery = (cursor?: string) =>
  `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;

const managed = <T>(
  path: string,
  method: "PATCH" | "PUT" | "POST",
  body: unknown,
  csrfToken: string,
) =>
  request<T>(path, {
    method,
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const changeOrganizationStatus = (
  organizationId: string,
  status: "active" | "suspended",
  reason: string,
  csrfToken: string,
) =>
  managed<{ id: string; status: string; cnpj_masked: string | null }>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/status`,
    "PATCH",
    { status, reason: reason.trim() },
    csrfToken,
  );

export const setOrganizationCnpj = (
  organizationId: string,
  cnpj: string,
  reason: string,
  csrfToken: string,
) =>
  managed<{ id: string; status: string; cnpj_masked: string | null }>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/cnpj`,
    "PUT",
    { cnpj, reason: reason.trim() },
    csrfToken,
  );

export const listOrganizationEvents = (
  organizationId: string,
  cursor?: string,
) =>
  request<ManagementEventPage>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/events?${eventsQuery(cursor)}`,
    { method: "GET" },
  );

export const changeUserStatus = (
  accountId: string,
  status: "active" | "suspended",
  reason: string,
  csrfToken: string,
) =>
  managed<{ id: string; status: string }>(
    `/v1/team/users/${encodeURIComponent(accountId)}/status`,
    "PATCH",
    { status, reason: reason.trim() },
    csrfToken,
  );

export const listUserEvents = (accountId: string, cursor?: string) =>
  request<ManagementEventPage>(
    `/v1/team/users/${encodeURIComponent(accountId)}/events?${eventsQuery(cursor)}`,
    { method: "GET" },
  );

export const inviteTeamMember = (
  email: string,
  role: TeamRoleName,
  reason: string,
  csrfToken: string,
) =>
  managed<{ invitation_id: string; expires_in: number }>(
    "/v1/team/members/invitations",
    "POST",
    { email: email.trim(), role, reason: reason.trim() },
    csrfToken,
  );

export const changeTeamMemberRole = (
  memberId: string,
  role: TeamRoleName,
  reason: string,
  csrfToken: string,
) =>
  managed<{ id: string; email: string; role: string; status: string }>(
    `/v1/team/members/${encodeURIComponent(memberId)}/role`,
    "PATCH",
    { role, reason: reason.trim() },
    csrfToken,
  );

export const changeTeamMemberStatus = (
  memberId: string,
  status: "active" | "suspended",
  reason: string,
  csrfToken: string,
) =>
  managed<{ id: string; email: string; role: string; status: string }>(
    `/v1/team/members/${encodeURIComponent(memberId)}/status`,
    "PATCH",
    { status, reason: reason.trim() },
    csrfToken,
  );

export const listTeamMemberEvents = (memberId: string, cursor?: string) =>
  request<ManagementEventPage>(
    `/v1/team/members/${encodeURIComponent(memberId)}/events?${eventsQuery(cursor)}`,
    { method: "GET" },
  );

export type ApplicationDeletion = {
  application_id: string;
  status: "deleted";
  audit_event_id: string;
};

/** Administrator only. Terminal: the application is deactivated and its history is kept. */
export const deleteTeamApplication = (
  applicationId: string,
  reason: string,
  csrfToken: string,
) =>
  request<ApplicationDeletion>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}`,
    {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason }),
    },
  );

/** Read-only executive aggregates (`/v1/team/reports/*`); the window is in America/Sao_Paulo. */
export const getTeamReport = <T>(
  path: string,
  from: string,
  to: string,
  compare: boolean,
  extra: Record<string, string> = {},
) => {
  const params = new URLSearchParams({
    from,
    to,
    compare: String(compare),
    ...extra,
  });
  return request<T>(`/v1/team/reports/${path}?${params.toString()}`, {
    method: "GET",
  });
};
