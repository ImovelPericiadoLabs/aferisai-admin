import { useEffect, useMemo, useState } from "react";
import { listOrganizations, type CommercialPolicy } from "./api";
import type { OrganizationOption } from "./CommercialPolicyForm";
import { resolveOrganization } from "./lookups";

/** Organisation names for the policy scope column: the first page plus any referenced id not on it. */
export function useCommercialPolicyOrganizations(items: CommercialPolicy[]) {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  useEffect(() => {
    let live = true;
    listOrganizations("")
      .then((page) => {
        if (live)
          setOrganizations(
            page.items.map((org) => ({ id: org.id, name: org.name })),
          );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const unknownOrgKey = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((item) => item.organization_id)
            .filter(
              (id): id is string =>
                id !== null && !organizations.some((org) => org.id === id),
            ),
        ),
      ]
        .slice(0, 20)
        .join(","),
    [items, organizations],
  );

  useEffect(() => {
    if (!unknownOrgKey) return;
    let live = true;
    void Promise.all(
      unknownOrgKey
        .split(",")
        .map((id) => resolveOrganization(id).catch(() => null)),
    ).then((found) => {
      if (!live) return;
      const known = found.filter((org) => org !== null);
      if (known.length)
        setOrganizations((current) => [
          ...current,
          ...known.map((org) => ({ id: org.id, name: org.label })),
        ]);
    });
    return () => {
      live = false;
    };
  }, [unknownOrgKey]);

  const orgNames = useMemo(
    () => Object.fromEntries(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );

  return { organizations, orgNames };
}
