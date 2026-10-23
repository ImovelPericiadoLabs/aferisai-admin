import type { CreatePromotionBody, PromotionAsset } from "./api";

export type PromotionState =
  "active" | "scheduled" | "exhausted" | "expired" | "suspended";

export function promotionState(
  asset: PromotionAsset,
  now: number = Date.now(),
): PromotionState {
  if (asset.status === "suspended") return "suspended";
  if (asset.use_limit !== null && asset.use_count >= asset.use_limit)
    return "exhausted";
  if (now > Date.parse(asset.valid_until)) return "expired";
  if (now < Date.parse(asset.valid_from)) return "scheduled";
  return "active";
}

export const promotionStateLabel: Record<PromotionState, string> = {
  active: "Ativa",
  scheduled: "Agendada",
  exhausted: "Esgotada",
  expired: "Expirada",
  suspended: "Suspensa",
};

export function usageOf(asset: PromotionAsset): {
  text: string;
  fraction: number | null;
} {
  if (asset.use_limit === null)
    return { text: `${asset.use_count} · sem limite`, fraction: null };
  return {
    text: `${asset.use_count} de ${asset.use_limit}`,
    fraction: Math.min(1, asset.use_count / asset.use_limit),
  };
}

export function countByState(
  items: PromotionAsset[],
  now: number = Date.now(),
): Record<"all" | PromotionState, number> {
  const counts = {
    all: items.length,
    active: 0,
    scheduled: 0,
    exhausted: 0,
    expired: 0,
    suspended: 0,
  };
  for (const item of items) counts[promotionState(item, now)] += 1;
  return counts;
}

export function filterPromotions(
  items: PromotionAsset[],
  state: "" | PromotionState,
  now: number = Date.now(),
): PromotionAsset[] {
  return state
    ? items.filter((item) => promotionState(item, now) === state)
    : items;
}

export type PromotionFormState = {
  policyVersionId: string;
  organizationId: string;
  kind: "coupon" | "link";
  validFrom: string;
  validUntil: string;
  publicLabel: string;
  useLimit: string;
};

const local = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

export function initialPromotionForm(
  now: Date = new Date(),
): PromotionFormState {
  return {
    policyVersionId: "",
    organizationId: "",
    kind: "coupon",
    validFrom: local(now),
    validUntil: local(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
    publicLabel: "",
    useLimit: "",
  };
}

export function validatePromotionForm(
  form: PromotionFormState,
): { ok: true; body: CreatePromotionBody } | { ok: false; message: string } {
  if (!form.policyVersionId)
    return { ok: false, message: "Escolha a regra da promoção." };
  if (!form.organizationId)
    return { ok: false, message: "Escolha a organização." };
  const from = Date.parse(form.validFrom);
  const until = Date.parse(form.validUntil);
  if (Number.isNaN(from) || Number.isNaN(until))
    return { ok: false, message: "Informe datas válidas." };
  if (until <= from)
    return {
      ok: false,
      message: "O fim da validade precisa ser depois do início.",
    };
  const label = form.publicLabel.trim();
  if (label.length > 200)
    return {
      ok: false,
      message: "O rótulo público aceita até 200 caracteres.",
    };
  const limitText = form.useLimit.trim();
  let useLimit: number | null = null;
  if (limitText !== "") {
    useLimit = Number(limitText);
    if (
      !/^\d+$/.test(limitText) ||
      !Number.isSafeInteger(useLimit) ||
      useLimit < 1
    )
      return {
        ok: false,
        message:
          "O limite de usos precisa ser um número inteiro de 1 em diante.",
      };
  }
  return {
    ok: true,
    body: {
      policy_version_id: form.policyVersionId,
      organization_id: form.organizationId,
      kind: form.kind,
      valid_from: new Date(from).toISOString(),
      valid_until: new Date(until).toISOString(),
      public_label: label || null,
      use_limit: useLimit,
    },
  };
}
