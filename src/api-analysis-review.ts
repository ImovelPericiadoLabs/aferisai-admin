import { base, request, responseError } from "./api-core";

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
    work_stage: string | null;
    completed_calls: number;
    planned_calls: number | null;
  }[];
  next_cursor: string | null;
};

export type SourceDecisionBody = {
  source_kind: SourceKind;
  reason: string;
  supersedes_decision_id: string | null;
};

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

export type AnalysisNoticeException = {
  notice_id: string;
  request_id: string;
  kind: "payment_confirmed" | "analysis_ready";
  channel: "email" | "whatsapp";
  status: "attempted" | "unknown";
  provider_message_id: string | null;
  attempted_at: string | null;
  created_at: string;
};

export type AnalysisNoticeExceptionPage = {
  items: AnalysisNoticeException[];
  next_cursor: string | null;
};

export const listAnalysisNoticeExceptions = (cursor?: string) =>
  request<AnalysisNoticeExceptionPage>(
    `/v1/team/analysis-requests/notice-exceptions?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const reconcileAnalysisNotice = (
  noticeId: string,
  evidenceRef: string,
  reason: string,
  csrfToken: string,
) =>
  request<{ id: string; notice_id: string; outcome: "recipient_received" }>(
    `/v1/team/analysis-requests/notice-exceptions/${encodeURIComponent(noticeId)}/reconciliations`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ evidence_ref: evidenceRef, reason }),
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
