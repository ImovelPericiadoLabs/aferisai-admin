import { eventsQuery, managed, request } from "./api-core";

export type UserOverview = {
  account: {
    id: string;
    email: string;
    status: string;
    created_at: string;
    last_login_at: string | null;
  };
  credits: {
    balance_cents: number;
    frozen_at: string | null;
    movements: {
      id: string;
      kind: string;
      delta_cents: number;
      balance_after_cents: number;
      reason: string;
      created_at: string;
    }[];
    truncated: boolean;
  };
  registry_requests: {
    id: string;
    source: string;
    product: string;
    status: string;
    item_count: number;
    result_signal: string | null;
    result_attention_count: number | null;
    created_at: string;
  }[];
  analyses: {
    id: string;
    source: string;
    status: string;
    work_status: string | null;
    created_at: string;
  }[];
  payments: {
    id: string;
    amount_cents: number;
    funding_source: string;
    payment_method: string;
    status: string;
    charge_attempt: string;
    subject_type: string;
    created_at: string;
    received_at: string | null;
  }[];
  truncated: Record<string, boolean>;
};

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

export const getUserOverview = (accountId: string) =>
  request<UserOverview>(
    `/v1/team/users/${encodeURIComponent(accountId)}/overview`,
    { method: "GET" },
  );

export const grantUserCredits = (
  accountId: string,
  amountCents: number,
  reason: string,
  csrfToken: string,
  requestId: string,
) =>
  managed<{ movement_id: string; balance_cents: number }>(
    `/v1/team/users/${encodeURIComponent(accountId)}/credits`,
    "POST",
    { request_id: requestId, amount_cents: amountCents, reason: reason.trim() },
    csrfToken,
  );

export const deleteUserAccount = (
  accountId: string,
  reason: string,
  csrfToken: string,
) =>
  managed<{ deletion_id: string; status: string }>(
    `/v1/team/users/${encodeURIComponent(accountId)}`,
    "DELETE",
    { reason: reason.trim() },
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
