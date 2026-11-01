import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, listAnalysisAttention, type AttentionPage } from "./api";
import {
  attentionView,
  attentionViewCounts,
  type AttentionViewId,
} from "./attention-model";
import { analysisWorkStatusLabel } from "./display-labels";
import { matchesQuery } from "./ops-model";

export function useAnalysesAttention({
  canReview,
  onUnauthorized,
}: {
  canReview: boolean;
  onUnauthorized: () => void;
}) {
  const [rows, setRows] = useState<AttentionPage["items"]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(canReview);
  const [error, setError] = useState("");
  const [view, setView] = useState<AttentionViewId>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(
    async (next?: string) => {
      setLoading(true);
      try {
        const page = await listAnalysisAttention(next);
        setRows((current) => (next ? [...current, ...page.items] : page.items));
        setCursor(page.next_cursor);
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar a API agora.",
          );
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    if (canReview) queueMicrotask(() => void load());
  }, [canReview, load]);

  const counts = useMemo(() => attentionViewCounts(rows), [rows]);
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (view === "all" || attentionView(row) === view) &&
          matchesQuery(
            [row.work_id, row.request_id, analysisWorkStatusLabel(row.status)],
            query,
          ),
      ),
    [rows, view, query],
  );

  return {
    rows,
    cursor,
    loading,
    error,
    view,
    setView,
    query,
    setQuery,
    counts,
    visible,
    load,
  };
}

export type AnalysesAttentionState = ReturnType<typeof useAnalysesAttention>;
