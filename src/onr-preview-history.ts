import { getOnrPreviewReviews, type OnrPreviewReviewHistory } from "./api";

/** Reads every page of the (ascending) version history of one attempt. */
export async function loadHistory(
  attemptId: string,
): Promise<OnrPreviewReviewHistory["items"]> {
  const all: OnrPreviewReviewHistory["items"] = [];
  let after = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    const page = await getOnrPreviewReviews(attemptId, after);
    all.push(...page.items);
    if (page.next_version === null) break;
    after = page.next_version;
  }
  return all;
}
