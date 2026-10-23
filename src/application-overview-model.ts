import type {
  PartnerCredential,
  WebhookDelivery,
  WebhookEndpoint,
} from "./api";

type Tone = "badge-neutral" | "badge-success" | "badge-warning" | "badge-info";

/** The path and query of a webhook address may carry secrets: show the host only. */
export function webhookHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "—";
  }
}

export function summarizeEndpoint(endpoint: WebhookEndpoint | null): {
  label: string;
  tone: Tone;
  detail: string;
} {
  if (!endpoint)
    return {
      label: "Não configurado",
      tone: "badge-neutral",
      detail: "Nenhum endereço de webhook cadastrado.",
    };
  const status =
    endpoint.status === "active"
      ? { label: "Ativo", tone: "badge-success" as const }
      : endpoint.status === "suspended"
        ? { label: "Suspenso", tone: "badge-warning" as const }
        : { label: "Rascunho", tone: "badge-neutral" as const };
  return { ...status, detail: webhookHost(endpoint.url) };
}

export function summarizeCredentials(items: PartnerCredential[]): {
  active: number;
  revoked: number;
  tone: Tone;
  label: string;
} {
  const active = items.filter((item) => item.status === "active").length;
  const revoked = items.length - active;
  return {
    active,
    revoked,
    tone: active > 0 ? "badge-success" : "badge-warning",
    label: active > 0 ? `${active} de 2 ativas` : "Nenhuma ativa",
  };
}

export function summarizeDelivery(delivery: WebhookDelivery | null): {
  label: string;
  tone: Tone;
  at: string | null;
} {
  if (!delivery)
    return { label: "Nenhuma entrega", tone: "badge-neutral", at: null };
  const map: Record<WebhookDelivery["status"], { label: string; tone: Tone }> =
    {
      delivered: { label: "Entregue", tone: "badge-success" },
      attempted: { label: "Tentativa sem sucesso", tone: "badge-warning" },
      unknown: { label: "Em conferência", tone: "badge-warning" },
      pending: { label: "Pendente", tone: "badge-info" },
      skipped: { label: "Não enviada", tone: "badge-neutral" },
    };
  return { ...map[delivery.status], at: delivery.created_at };
}

/** Metrics over the deliveries actually loaded; never extrapolated. */
export function summarizeDeliveries(items: WebhookDelivery[]): {
  total: number;
  delivered: number;
  problems: number;
  successRate: number | null;
  averageMs: number | null;
} {
  const delivered = items.filter((item) => item.status === "delivered").length;
  const problems = items.filter(
    (item) => item.status === "attempted" || item.status === "unknown",
  ).length;
  const decided = delivered + problems;
  const timed = items.filter(
    (item): item is WebhookDelivery & { duration_ms: number } =>
      item.duration_ms !== null,
  );
  return {
    total: items.length,
    delivered,
    problems,
    successRate: decided > 0 ? delivered / decided : null,
    averageMs: timed.length
      ? Math.round(
          timed.reduce((sum, item) => sum + item.duration_ms, 0) / timed.length,
        )
      : null,
  };
}
