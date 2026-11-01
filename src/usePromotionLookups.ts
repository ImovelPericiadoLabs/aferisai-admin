import { useEffect, useMemo, useState } from "react";
import { listCommercialPolicies, type PromotionAsset } from "./api";
import { itemLabel, promotionKindLabel } from "./display-labels";
import { resolveOrganization } from "./lookups";

export function usePromotionLookups(items: PromotionAsset[]) {
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [ruleNames, setRuleNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    listCommercialPolicies(undefined, { channel: "promotion" })
      .then((page) => {
        if (!live) return;
        setRuleNames(
          Object.fromEntries(
            page.items
              .filter((policy) => policy.channel === "promotion")
              .map((policy) => [
                policy.id,
                `${itemLabel(policy.item_code)} · ${promotionKindLabel(policy.attribution)}`,
              ]),
          ),
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
            .filter((id) => !(id in orgNames)),
        ),
      ]
        .slice(0, 20)
        .join(","),
    [items, orgNames],
  );

  useEffect(() => {
    if (!unknownOrgKey) return;
    let live = true;
    void Promise.all(
      unknownOrgKey.split(",").map(async (id) => {
        const found = await resolveOrganization(id).catch(() => null);
        return [id, found?.label ?? ""] as const;
      }),
    ).then((pairs) => {
      if (live)
        setOrgNames((current) => ({
          ...current,
          ...Object.fromEntries(pairs),
        }));
    });
    return () => {
      live = false;
    };
  }, [unknownOrgKey]);

  const orgName = (id: string) =>
    orgNames[id] || `Organização ${id.slice(0, 8)}…`;
  const ruleName = (id: string) => ruleNames[id] || `Regra ${id.slice(0, 8)}…`;

  return { orgName, ruleName };
}
