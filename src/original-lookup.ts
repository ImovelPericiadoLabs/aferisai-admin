import { ApiError, getAnalysisReview } from "./api";

export type RequestLookup =
  | { ok: true; requestId: string }
  | { ok: false; unauthorized: boolean; message: string };

/**
 * An original is opened by request. Cases that carry the request use it; otherwise the
 * review packet of the work reveals it (only works that reached review have one).
 */
export async function resolveRequestId(target: {
  workId: string;
  requestId: string | null;
}): Promise<RequestLookup> {
  if (target.requestId) return { ok: true, requestId: target.requestId };
  try {
    const packet = await getAnalysisReview(target.workId);
    return { ok: true, requestId: packet.request_id };
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 401)
      return { ok: false, unauthorized: true, message: cause.detail };
    return {
      ok: false,
      unauthorized: false,
      message:
        "Não foi possível localizar o pedido deste documento. Trabalhos que não chegaram à revisão ainda não informam o pedido.",
    };
  }
}
