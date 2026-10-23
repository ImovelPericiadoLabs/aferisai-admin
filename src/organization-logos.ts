import { getLogoBlobUrl, getOrganization } from "./api";
import { createLogoLoader } from "./logo-loader";

/** Session-wide logo cache for organization lists (a few requests at a time). */
export const organizationLogos = createLogoLoader({
  detail: async (organizationId) =>
    (await getOrganization(organizationId)).logo_url,
  blob: getLogoBlobUrl,
  concurrency: 3,
});
