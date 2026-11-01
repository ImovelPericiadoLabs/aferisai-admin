import { request } from "./api-core";
import { invitePartnerMember } from "./api-partner-session";
import type { PartnerRole } from "./api-partner-session";

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
