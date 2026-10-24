import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getOnrEndpoint,
  listRegistryCommercialTerms,
  listRegistryVisualizationTariffs,
  type RegistrySupplierAccount,
} from "./api";
import type { AccountSnapshot } from "./account-model";

const EMPTY: AccountSnapshot = {
  endpoint: null,
  tariff: null,
  terms: null,
  loading: true,
};

/** The few numbers every section of the account needs, loaded once for the whole panel. */
export function useAccountSnapshot(
  account: RegistrySupplierAccount | null,
  onUnauthorized: () => void,
) {
  const [snapshot, setSnapshot] = useState<AccountSnapshot>(EMPTY);
  const [version, setVersion] = useState(0);
  const accountId = account?.id ?? null;
  const provider = account?.provider ?? null;

  useEffect(() => {
    if (!accountId) {
      queueMicrotask(() => setSnapshot(EMPTY));
      return;
    }
    let live = true;
    queueMicrotask(() =>
      setSnapshot((current) => ({ ...current, loading: true })),
    );
    const onr = provider === "onr";
    void Promise.allSettled([
      onr ? getOnrEndpoint(accountId) : Promise.resolve(null),
      listRegistryVisualizationTariffs(accountId),
      onr ? listRegistryCommercialTerms(accountId) : Promise.resolve(null),
    ]).then(([endpoint, tariffs, terms]) => {
      if (!live) return;
      for (const result of [endpoint, tariffs, terms])
        if (
          result.status === "rejected" &&
          result.reason instanceof ApiError &&
          result.reason.status === 401
        )
          onUnauthorized();
      setSnapshot({
        endpoint: endpoint.status === "fulfilled" ? endpoint.value : null,
        tariff:
          tariffs.status === "fulfilled"
            ? (tariffs.value.items[0] ?? null)
            : null,
        terms:
          terms.status === "fulfilled"
            ? (terms.value?.effective ?? null)
            : null,
        loading: false,
      });
    });
    return () => {
      live = false;
    };
  }, [accountId, provider, version, onUnauthorized]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { snapshot, reload };
}
