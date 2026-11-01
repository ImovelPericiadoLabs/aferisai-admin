import { request } from "./api-core";

export const createSitePreviewGrant = (
  email: string,
  challengeId: string,
  credential: Record<string, unknown>,
) =>
  request<{ grant: string; site_origin: string }>(
    "/v1/team/passkeys/authentication/site-preview",
    {
      method: "POST",
      body: JSON.stringify({ email, challenge_id: challengeId, credential }),
    },
  );

export type MaintenanceMode = "off" | "restricted" | "full";

export type SiteMaintenancePolicy = {
  mode: MaintenanceMode;
  enabled: boolean;
  active: boolean;
  version: number;
  starts_at: string | null;
  ends_at: string | null;
  public_message: string | null;
  internal_note: string | null;
  updated_by_id: string | null;
  updated_at: string | null;
};

export type SiteMaintenanceChange = {
  expected_version: number;
  mode: MaintenanceMode;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  public_message: string | null;
  internal_note: string | null;
  reason: string;
};

export const getSiteMaintenancePolicy = (csrfToken: string) =>
  request<SiteMaintenancePolicy>("/v1/team/site-maintenance", {
    method: "GET",
    headers: { "X-CSRF-Token": csrfToken },
  });

export const updateSiteMaintenancePolicy = (
  body: SiteMaintenanceChange,
  csrfToken: string,
) =>
  request<SiteMaintenancePolicy>("/v1/team/site-maintenance", {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
