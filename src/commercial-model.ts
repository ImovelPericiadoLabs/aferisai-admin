import type { CommercialPolicy, CommercialPolicyDraft } from "./api";
import { shortId } from "./picker-model";

export type PolicyStatus = CommercialPolicy["status"];
export type PolicyChannel = CommercialPolicy["channel"];

export type FormState = {
  organizationId: string;
  applicationId: string;
  channel: PolicyChannel;
  source: CommercialPolicy["source"];
  itemCode: string;
  attribution: CommercialPolicy["attribution"];
  validFrom: string;
  validUntil: string;
  discountPercent: string;
  discountReais: string;
  commissionPercent: string;
  commissionReais: string;
  reason: string;
};

export const itemOptions = [
  { value: "matricula", label: "Matrícula" },
  { value: "inteiro_teor_simples", label: "Inteiro teor simples" },
  { value: "inteiro_teor", label: "Inteiro teor" },
  { value: "visualizacao", label: "Visualização" },
  { value: "*", label: "Todos os itens desta entrada" },
];

const localInput = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

export function toLocal(iso: string): string {
  return localInput(new Date(iso));
}

export function initialForm(): FormState {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    organizationId: "",
    applicationId: "",
    channel: "site",
    source: "number",
    itemCode: "matricula",
    attribution: "public",
    validFrom: localInput(now),
    validUntil: localInput(tomorrow),
    discountPercent: "0",
    discountReais: "0",
    commissionPercent: "0",
    commissionReais: "0",
    reason: "",
  };
}

const cents = (value: string) => Math.round(Number(value) * 100);
const bps = (value: string) => Math.round(Number(value) * 100);

export function formToDraftBody(form: FormState): CommercialPolicyDraft {
  return {
    organization_id:
      form.channel === "site" ? null : form.organizationId.trim() || null,
    application_id:
      form.channel === "integration" ? form.applicationId.trim() || null : null,
    channel: form.channel,
    source: form.source,
    item_code: form.itemCode.trim(),
    attribution: form.attribution,
    valid_from: new Date(form.validFrom).toISOString(),
    valid_until: new Date(form.validUntil).toISOString(),
    discount_fixed_cents: cents(form.discountReais),
    discount_rate_bps: bps(form.discountPercent),
    commission_fixed_cents: cents(form.commissionReais),
    commission_rate_bps: bps(form.commissionPercent),
    reason: form.reason.trim(),
  };
}

export function policyToForm(policy: CommercialPolicy): FormState {
  return {
    organizationId: policy.organization_id ?? "",
    applicationId: policy.application_id ?? "",
    channel: policy.channel,
    source: policy.source,
    itemCode: policy.item_code,
    attribution: policy.attribution,
    validFrom: toLocal(policy.valid_from),
    validUntil: toLocal(policy.valid_until),
    discountPercent: (policy.discount_rate_bps / 100).toString(),
    discountReais: (policy.discount_fixed_cents / 100).toString(),
    commissionPercent: (policy.commission_rate_bps / 100).toString(),
    commissionReais: (policy.commission_fixed_cents / 100).toString(),
    reason: "",
  };
}

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);

export function formatRate(rateBps: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(rateBps / 100)}%`;
}

export function describeAmount(rateBps: number, fixedCents: number): string {
  const parts: string[] = [];
  if (rateBps > 0) parts.push(formatRate(rateBps));
  if (fixedCents > 0) parts.push(money(fixedCents));
  return parts.length ? parts.join(" + ") : "—";
}

export function validityState(
  validFrom: string,
  validUntil: string,
  now = Date.now(),
): "future" | "active" | "expired" {
  if (now < Date.parse(validFrom)) return "future";
  if (now > Date.parse(validUntil)) return "expired";
  return "active";
}

export function countByStatus(
  items: CommercialPolicy[],
): Record<"all" | PolicyStatus, number> {
  const counts = { all: items.length, draft: 0, published: 0, suspended: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

export function filterPolicies(
  items: CommercialPolicy[],
  status: "" | PolicyStatus,
  channel: "" | PolicyChannel,
): CommercialPolicy[] {
  return items.filter(
    (item) =>
      (!status || item.status === status) &&
      (!channel || item.channel === channel),
  );
}

export function scopeSummary(
  policy: CommercialPolicy,
  orgNames: Record<string, string>,
): { primary: string; secondary: string } {
  if (policy.channel === "site")
    return { primary: "Site direto", secondary: "Todos os clientes" };
  const org = policy.organization_id
    ? (orgNames[policy.organization_id] ??
      `Organização ${shortId(policy.organization_id)}`)
    : null;
  if (policy.channel === "integration")
    return {
      primary: org ?? "Todas as organizações",
      secondary: policy.application_id
        ? "Integração · aplicação específica"
        : "Integração · todas as aplicações",
    };
  const kind = policy.attribution === "coupon" ? "Cupom" : "Link promocional";
  return {
    primary: kind,
    secondary: org ? `Promoção · ${org}` : "Promoção · qualquer organização",
  };
}

export function statusTone(status: PolicyStatus): string {
  return status === "published"
    ? "badge-success"
    : status === "suspended"
      ? "badge-warning"
      : "badge-neutral";
}
