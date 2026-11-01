import { changeReasonHeaders } from "./reason";
import { request } from "./api-core";

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

export type ApplicationProfile = {
  application_id: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  privacy_url: string | null;
  terms_url: string | null;
  support_url: string | null;
  version: number;
};

export const getApplicationProfile = (applicationId: string) =>
  request<ApplicationProfile>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/profile`,
    { method: "GET" },
  );

export const replaceApplicationProfile = (
  applicationId: string,
  profile: Omit<ApplicationProfile, "application_id" | "version">,
  expectedVersion: number,
  csrfToken: string,
) =>
  request<ApplicationProfile>(
    `/v1/team/applications/${encodeURIComponent(applicationId)}/profile`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ ...profile, expected_version: expectedVersion }),
    },
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
