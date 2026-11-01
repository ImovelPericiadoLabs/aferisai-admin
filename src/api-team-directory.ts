import { request } from "./api-core";

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
