import { changeReasonHeaders } from "./reason";
import { request } from "./api-core";

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
