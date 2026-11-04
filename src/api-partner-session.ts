import { request } from "./api-core";
import type { CsrfResult, LoginBody, SessionResult } from "./api-session";

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

export type PartnerMfaRecoveryRequest = {
  challenge_id: string | null;
  expires_in: number;
};

export type PartnerMfaRecoveryVerification = {
  recovery_token: string;
  totp_secret: string;
  otpauth_uri: string;
};

export type PartnerPasswordRecoveryResponse = { message: string };

export type PartnerPasskeyOptions = {
  challenge_id: string;
  public_key: Record<string, unknown>;
};

export type PartnerPasskeyItem = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};

export type PartnerPasskeyList = { items: PartnerPasskeyItem[] };

export type PartnerSupportSession = {
  csrf_token: string;
  expires_in: number;
  partner_member_id: string;
  organization_id: string;
  read_only: true;
};

export const createPartnerSupportSession = (
  partnerMemberId: string,
  organizationId: string,
  reason: string,
  csrfToken: string,
) =>
  request<PartnerSupportSession>("/v1/team/partner-support-sessions", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ partner_member_id: partnerMemberId, organization_id: organizationId, reason }),
  });

export const deletePartnerSupportSession = (csrfToken: string) =>
  request<void>("/v1/team/partner-support-sessions/current", {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });

export const createPartnerSession = (body: LoginBody) =>
  request<SessionResult>("/v1/partner/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const requestPartnerMfaRecovery = (email: string, password: string) =>
  request<PartnerMfaRecoveryRequest>("/v1/partner/mfa/recovery/request", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const verifyPartnerMfaRecovery = (body: {
  challenge_id: string;
  email: string;
  password: string;
  code: string;
}) =>
  request<PartnerMfaRecoveryVerification>("/v1/partner/mfa/recovery/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const completePartnerMfaRecovery = (
  recoveryToken: string,
  otp: string,
) =>
  request<void>("/v1/partner/mfa/recovery/complete", {
    method: "POST",
    body: JSON.stringify({ recovery_token: recoveryToken, otp }),
  });

export const requestPartnerPasswordRecovery = (email: string) =>
  request<PartnerPasswordRecoveryResponse>("/v1/partner/password/recovery/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const completePartnerPasswordRecovery = (token: string, password: string) =>
  request<void>("/v1/partner/password/recovery/complete", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

export const beginPartnerPasskeyLogin = (email: string) =>
  request<PartnerPasskeyOptions>("/v1/partner/passkeys/authentication/options", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const finishPartnerPasskeyLogin = (
  email: string,
  challengeId: string,
  credential: Record<string, unknown>,
) =>
  request<SessionResult>("/v1/partner/passkeys/authentication/confirm", {
    method: "POST",
    body: JSON.stringify({ email, challenge_id: challengeId, credential }),
  });

export const listPartnerPasskeys = () =>
  request<PartnerPasskeyList>("/v1/partner/passkeys", { method: "GET" });

export const beginPartnerPasskeyRegistration = (csrfToken: string) =>
  request<PartnerPasskeyOptions>("/v1/partner/passkeys/registration/options", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });

export const finishPartnerPasskeyRegistration = (
  challengeId: string,
  credential: Record<string, unknown>,
  label: string,
  csrfToken: string,
) =>
  request<PartnerPasskeyItem>("/v1/partner/passkeys/registration/confirm", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ challenge_id: challengeId, credential, label }),
  });

export const revokePartnerPasskey = (id: string, csrfToken: string) =>
  request<void>(`/v1/partner/passkeys/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
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
