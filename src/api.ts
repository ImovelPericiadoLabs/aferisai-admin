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
export type OrganizationListItem = {
  id: string;
  slug: string;
  name: string;
  status: string;
};
export type OrganizationList = {
  items: OrganizationListItem[];
  next_cursor: string | null;
};
export type OrganizationDetail = OrganizationListItem & {
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
export type PaymentExceptionCase = {
  id: string;
  work_id: string;
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

export const listCommercialPolicies = (cursor?: string) =>
  request<CommercialPolicyPage>(
    `/v1/team/commercial-policies?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

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
export const createOrganization = (body: OnboardingBody, csrfToken: string) =>
  request<OnboardingResult>("/v1/team/organizations", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
export function listOrganizations(
  query = "",
  cursor?: string,
): Promise<OrganizationList> {
  const params = new URLSearchParams({ limit: "20" });
  if (query.trim()) params.set("q", query.trim());
  if (cursor) params.set("cursor", cursor);
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

export const grantApplicationPermission = (
  applicationId: string,
  code: string,
  csrfToken: string,
) =>
  request<{ application_id: string; code: string; granted: boolean }>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/permissions/${encodeURIComponent(code)}`,
    { method: "PUT", headers: { "X-CSRF-Token": csrfToken } },
  );

export const revokeApplicationPermission = (
  applicationId: string,
  code: string,
  csrfToken: string,
) =>
  request<void>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/permissions/${encodeURIComponent(code)}`,
    { method: "DELETE", headers: { "X-CSRF-Token": csrfToken } },
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
): Promise<CredentialList> {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return request<CredentialList>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/credentials?${params}`,
    { method: "GET" },
  );
}

export const issuePartnerCredential = (
  applicationId: string,
  issueRequestId: string,
  csrfToken: string,
) =>
  request<IssuedPartnerCredential>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/credentials`,
    {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Idempotency-Key": issueRequestId,
      },
    },
  );

export const revokePartnerCredential = (
  applicationId: string,
  credentialId: string,
  csrfToken: string,
) =>
  request<void>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/credentials/${encodeURIComponent(credentialId)}`,
    { method: "DELETE", headers: { "X-CSRF-Token": csrfToken } },
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
  status: "active" | "suspended";
  created_at: string;
  plain_secret: string | null;
};

export const getApplicationWebhookEndpoint = (applicationId: string) =>
  request<WebhookEndpoint>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
    { method: "GET" },
  );

export const registerApplicationWebhookEndpoint = (
  applicationId: string,
  url: string,
  csrfToken: string,
) =>
  request<WebhookEndpoint>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
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
) =>
  request<WebhookEndpoint>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/webhook-endpoint/status`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ status }),
    },
  );

export const deleteApplicationWebhookEndpoint = (
  applicationId: string,
  csrfToken: string,
) =>
  request<void>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
    {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken },
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
