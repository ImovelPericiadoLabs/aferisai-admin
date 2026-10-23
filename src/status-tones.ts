export function providerStatusTone(
  status: "draft" | "active" | "suspended",
): "badge-neutral" | "badge-success" | "badge-warning" {
  if (status === "active") return "badge-success";
  if (status === "suspended") return "badge-warning";
  return "badge-neutral";
}
