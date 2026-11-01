import { ApiError, reconcileNoPurchase } from "./api";
import { shortId } from "./reconciliation-format";
import type { UncertainRow } from "./reconciliation-model";

export async function reconcileNoPurchaseBatch(
  rows: UncertainRow[],
  reason: string,
  csrf: string,
  onUnauthorized: () => void,
): Promise<{ completed: string[]; failures: string[] }> {
  const completed: string[] = [];
  const failures: string[] = [];
  for (const row of rows) {
    try {
      await reconcileNoPurchase(row.item_id, reason, csrf);
      completed.push(row.item_id);
    } catch (cause) {
      failures.push(
        `${shortId(row.item_id)}: ${cause instanceof ApiError ? cause.detail : "falha de conexão"}`,
      );
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
        break;
      }
    }
  }
  return { completed, failures };
}
