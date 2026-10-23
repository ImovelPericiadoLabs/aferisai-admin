import type {
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventCatalogItem,
} from "./api";

export type KeyStage = "none" | "prepared" | "tested";

export function keyStage(endpoint: WebhookEndpoint): KeyStage {
  if (!endpoint.pending_key_version) return "none";
  return endpoint.pending_key_tested_at ? "tested" : "prepared";
}

export const selectableEvents = (catalog: WebhookEventCatalogItem[]) =>
  catalog.filter((item) => item.subscribable);

export function toggleEvent(
  selected: string[],
  type: string,
  order: string[],
): string[] {
  const next = new Set(selected);
  if (next.has(type)) next.delete(type);
  else next.add(type);
  return order.filter((item) => next.has(item));
}

export function selectionChanged(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return true;
  const set = new Set(a);
  return b.some((item) => !set.has(item));
}

/** Resend applies to real events whose delivery ended in failure or an uncertain result. */
export const canResend = (delivery: WebhookDelivery) =>
  !delivery.is_test &&
  (delivery.status === "attempted" || delivery.status === "unknown");
