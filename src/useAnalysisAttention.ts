import { useEffect, useState } from "react";
import { ApiError, listAnalysisAttention, type AttentionPage } from "./api";
import { errorMessage } from "./analysis-review-labels";

/** "Atenção" tab: works needing attention, loaded when the member can review. */
export function useAnalysisAttention(
  canReview: boolean,
  onUnauthorized: () => void,
) {
  const [attention, setAttention] = useState<AttentionPage | null>(null);
  const [attentionError, setAttentionError] = useState("");
  const [attentionBusy, setAttentionBusy] = useState(false);

  useEffect(() => {
    if (!canReview) return;
    void listAnalysisAttention()
      .then(setAttention)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setAttentionError(errorMessage(cause));
      });
  }, [canReview, onUnauthorized]);

  async function loadAttention(cursor?: string) {
    setAttentionBusy(true);
    setAttentionError("");
    try {
      setAttention(await listAnalysisAttention(cursor));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setAttentionError(errorMessage(cause));
    } finally {
      setAttentionBusy(false);
    }
  }

  return { attention, attentionError, attentionBusy, loadAttention };
}

export type AnalysisAttention = ReturnType<typeof useAnalysisAttention>;
