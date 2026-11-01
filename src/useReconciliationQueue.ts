import { useCallback, useEffect, useState } from "react";
import { ApiError, listUncertainSubmissions } from "./api";
import type { ReconciliationScope } from "./reconciliation-format";
import type { UncertainRow } from "./reconciliation-model";

export function useReconciliationQueue(
  scope: ReconciliationScope,
  onUnauthorized: () => void,
) {
  const [items, setItems] = useState<UncertainRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const page = await listUncertainSubmissions(cursor, scope);
        setItems((current) =>
          cursor ? [...current, ...page.items] : page.items,
        );
        setNextCursor(page.next_cursor);
        setListError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setListError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar a fila.",
          );
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized, scope],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  return {
    items,
    setItems,
    nextCursor,
    setNextCursor,
    loading,
    setLoading,
    listError,
    load,
  };
}
