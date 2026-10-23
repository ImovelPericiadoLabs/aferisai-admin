import { getLogoBlobUrl, getOrganization } from "./api";
import { createLogoLoader } from "./logo-loader";

/** Session-wide logo cache for organization lists (a few requests at a time). */
export const organizationLogos = createLogoLoader({
  detail: async (organizationId) =>
    (await getOrganization(organizationId)).logo_url,
  blob: getLogoBlobUrl,
  concurrency: 3,
});

/**
 * Logos seen by a partner person: the path always comes from the session or the
 * company list, so the team detail endpoint is never asked.
 */
export const partnerOrganizationLogos = createLogoLoader({
  detail: async () => null,
  blob: getLogoBlobUrl,
  concurrency: 3,
});
