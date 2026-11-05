import { useEffect, useMemo, useState } from "react";
import {
  getApplicationProfile,
  getLogoBlobUrl,
  getOrganization,
  listOrganizations,
  mediaUrl,
  type ApplicationProfile,
  type TeamConnection,
} from "./api";

export type ApplicationIdentity = {
  name: string | null;
  organizationName: string | null;
  logoUrl: string | null;
  profile: ApplicationProfile | null;
};

type DirectoryEntry = {
  name: string;
  organizationName: string;
  organizationLogo: string | null;
};

const profiles = new Map<string, Promise<ApplicationProfile | null>>();
const blobs = new Map<string, Promise<string | null>>();
let directory: Promise<Map<string, DirectoryEntry>> | null = null;

const profileOf = (id: string) => {
  let hit = profiles.get(id);
  if (!hit) {
    hit = getApplicationProfile(id).catch(() => null);
    profiles.set(id, hit);
  }
  return hit;
};

const blobOf = (path: string | null | undefined) => {
  if (!path || !mediaUrl(path)) return Promise.resolve(null);
  let hit = blobs.get(path);
  if (!hit) {
    hit = getLogoBlobUrl(path).catch(() => null);
    blobs.set(path, hit);
  }
  return hit;
};

/**
 * The connection only carries ids. Until the backend sends the application name, the
 * partner organizations are read once (a few pages, a few at a time) to learn who is who.
 */
function loadDirectory(): Promise<Map<string, DirectoryEntry>> {
  directory ??= (async () => {
    const found = new Map<string, DirectoryEntry>();
    try {
      let cursor: string | undefined;
      const organizations: { id: string }[] = [];
      for (let page = 0; page < 5; page += 1) {
        const result = await listOrganizations("", cursor);
        organizations.push(...result.items);
        if (!result.next_cursor) break;
        cursor = result.next_cursor;
      }
      for (let i = 0; i < organizations.length; i += 4) {
        const batch = await Promise.all(
          organizations
            .slice(i, i + 4)
            .map((org) => getOrganization(org.id).catch(() => null)),
        );
        for (const detail of batch) {
          if (!detail) continue;
          for (const app of detail.applications)
            found.set(app.id, {
              name: app.name,
              organizationName: detail.name,
              organizationLogo: detail.logo_url,
            });
        }
      }
    } catch {
      /* names stay unknown; the screen still shows the ids */
    }
    return found;
  })();
  return directory;
}

/** Name, logo and links of each partner application on screen. */
export function useApplicationIdentities(items: TeamConnection[]) {
  const [identities, setIdentities] = useState<
    Map<string, ApplicationIdentity>
  >(new Map());
  const key = useMemo(
    () =>
      [...new Set(items.map((item) => item.application_id))].sort().join(","),
    [items],
  );

  useEffect(() => {
    let live = true;
    const ids = key ? key.split(",") : [];
    const known = new Map(
      items.flatMap((item) =>
        item.application
          ? [[item.application_id, item.application] as const]
          : [],
      ),
    );
    void (async () => {
      const needsDirectory = ids.some((id) => !known.has(id));
      const dir = needsDirectory ? await loadDirectory() : new Map();
      await Promise.all(
        ids.map(async (id) => {
          const profile = await profileOf(id);
          const given = known.get(id);
          const entry = dir.get(id);
          // A broken application logo must not hide the organization's: try each in turn.
          let logoUrl: string | null = null;
          for (const path of [
            profile?.logo_url,
            given?.logo_url,
            given?.organization?.logo_url,
            entry?.organizationLogo,
          ]) {
            logoUrl = await blobOf(path);
            if (logoUrl) break;
          }
          if (!live) return;
          setIdentities((current) =>
            new Map(current).set(id, {
              name: given?.name ?? entry?.name ?? null,
              organizationName:
                given?.organization?.name ?? entry?.organizationName ?? null,
              logoUrl,
              profile,
            }),
          );
        }),
      );
    })();
    return () => {
      live = false;
    };
    // `items` is read for the optional backend-provided application; `key` is what must retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return identities;
}
