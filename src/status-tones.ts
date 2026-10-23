export function providerStatusTone(
  status: "draft" | "active" | "suspended",
): "badge-neutral" | "badge-success" | "badge-warning" {
  if (status === "active") return "badge-success";
  if (status === "suspended") return "badge-warning";
  return "badge-neutral";
}

type Tone = "badge-neutral" | "badge-success" | "badge-warning" | "badge-info";

export function promotionTone(
  state: "active" | "scheduled" | "exhausted" | "expired" | "suspended",
): Tone {
  if (state === "active") return "badge-success";
  if (state === "scheduled") return "badge-info";
  if (state === "exhausted" || state === "suspended") return "badge-warning";
  return "badge-neutral";
}

export function stageTone(
  stage: "awaiting-proposal" | "awaiting-financial" | "executing" | "done",
): Tone {
  if (stage === "done") return "badge-success";
  if (stage === "executing") return "badge-warning";
  if (stage === "awaiting-financial") return "badge-info";
  return "badge-neutral";
}
