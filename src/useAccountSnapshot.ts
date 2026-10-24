import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getSupplierAccountSummary,
  listRegistryCommercialTerms,
  listRegistryVisualizationTariffs,
  type RegistryCommercialTerms,
  type RegistrySupplierAccount,
  type RegistryVisualizationTariff,
} from "./api";
import type { AccountSnapshot } from "./account-model";

type Loaded = {
  snapshot: AccountSnapshot;
  tariff: RegistryVisualizationTariff | null;
  terms: RegistryCommercialTerms | null;
};
const EMPTY: Loaded = {
  snapshot: { summary: null, loading: true },
  tariff: null,
  terms: null,
};

/** The summary plus the two detailed records the overview and the price view show. */
export function useAccountSnapshot(
  account: RegistrySupplierAccount | null,
  onUnauthorized: () => void,
) {
  const [state, setState] = useState<Loaded>(EMPTY);
  const [version, setVersion] = useState(0);
  const accountId = account?.id ?? null;
  const provider = account?.provider ?? null;

  useEffect(() => {
    if (!accountId) {
      queueMicrotask(() => setState(EMPTY));
      return;
    }
    let live = true;
    queueMicrotask(() =>
      setState((current) => ({
        ...current,
        snapshot: { ...current.snapshot, loading: true },
      })),
    );
    void Promise.allSettled([
      getSupplierAccountSummary(accountId),
      listRegistryVisualizationTariffs(accountId),
      provider === "onr"
        ? listRegistryCommercialTerms(accountId)
        : Promise.resolve(null),
    ]).then(([summary, tariffs, terms]) => {
      if (!live) return;
      for (const result of [summary, tariffs, terms])
        if (
          result.status === "rejected" &&
          result.reason instanceof ApiError &&
          result.reason.status === 401
        )
          onUnauthorized();
      setState({
        snapshot: {
          summary: summary.status === "fulfilled" ? summary.value : null,
          loading: false,
        },
        tariff:
          tariffs.status === "fulfilled"
            ? (tariffs.value.items[0] ?? null)
            : null,
        terms:
          terms.status === "fulfilled"
            ? (terms.value?.effective ?? null)
            : null,
      });
    });
    return () => {
      live = false;
    };
  }, [accountId, provider, version, onUnauthorized]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}
