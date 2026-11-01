import { useEffect, useState } from "react";
import {
  ApiError,
  listTeamAnalysisRequests,
  type RequestOperationPage,
} from "./api";
import { errorMessage } from "./analysis-review-labels";

/** "Pedidos" tab: paginated list of analysis requests, loaded on mount. */
export function useAnalysisRequests(onUnauthorized: () => void) {
  const [requests, setRequests] = useState<RequestOperationPage | null>(null);
  const [requestsBusy, setRequestsBusy] = useState(false);
  const [requestsError, setRequestsError] = useState("");

  useEffect(() => {
    void listTeamAnalysisRequests()
      .then(setRequests)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setRequestsError(errorMessage(cause));
      });
  }, [onUnauthorized]);

  async function loadMoreRequests() {
    if (!requests?.next_cursor) return;
    setRequestsBusy(true);
    setRequestsError("");
    try {
      const page = await listTeamAnalysisRequests(requests.next_cursor);
      setRequests((prev) =>
        prev
          ? {
              items: [...prev.items, ...page.items],
              next_cursor: page.next_cursor,
            }
          : page,
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setRequestsError(errorMessage(cause));
    } finally {
      setRequestsBusy(false);
    }
  }

  return { requests, requestsBusy, requestsError, loadMoreRequests };
}

export type AnalysisRequests = ReturnType<typeof useAnalysisRequests>;
