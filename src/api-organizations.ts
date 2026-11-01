import { request } from "./api-core";

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
