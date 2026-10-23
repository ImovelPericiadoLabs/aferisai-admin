import type { TeamRegistryRequestPage } from "./api";
import { itemLabel, registryStatusLabel } from "./display-labels";
import type { Kpi, TimelineStep } from "./OpsParts";
import type { RowTone } from "./OpsTable";

export type RegistryRow = TeamRegistryRequestPage["items"][number];
export type RegistryViewId =
  "all" | "attention" | "waiting" | "in_progress" | "done";

export const REGISTRY_VIEWS: { id: RegistryViewId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "attention", label: "Com pendência" },
  { id: "waiting", label: "Aguardando" },
  { id: "in_progress", label: "No cartório" },
  { id: "done", label: "Confirmados" },
];

export const SOURCE_FILTERS = [
  { value: "", label: "Qualquer fonte" },
  { value: "number", label: "Número/CNM" },
  { value: "address", label: "Endereço" },
];

export const productLabel = (product: string) => itemLabel(product);

export function registryView(
  item: RegistryRow,
): Exclude<RegistryViewId, "all"> {
  if (item.status === "pending" || item.status === "awaiting_input")
    return "waiting";
  if (item.status === "dispatched") return "in_progress";
  if (item.status === "confirmed") return "done";
  return "attention";
}

export function registryTone(item: RegistryRow): RowTone | undefined {
  if (item.status === "failed" || item.status === "unknown") return "danger";
  if (item.status === "unavailable") return "warn";
  return undefined;
}

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export const registryBadge = (item: RegistryRow): BadgeTone =>
  item.status === "confirmed"
    ? "success"
    : item.status === "dispatched"
      ? "info"
      : item.status === "failed" || item.status === "unknown"
        ? "danger"
        : item.status === "unavailable"
          ? "warning"
          : "neutral";

export function registryViewCounts(
  rows: RegistryRow[],
): Record<RegistryViewId, number> {
  const counts: Record<RegistryViewId, number> = {
    all: rows.length,
    attention: 0,
    waiting: 0,
    in_progress: 0,
    done: 0,
  };
  for (const item of rows) counts[registryView(item)] += 1;
  return counts;
}

export function registryKpis(rows: RegistryRow[]): Kpi[] {
  const counts = registryViewCounts(rows);
  const hint = `nos ${rows.length} carregados`;
  return [
    { id: "all", label: "Pedidos", value: counts.all, hint: "carregados" },
    {
      id: "attention",
      label: "Com pendência",
      value: counts.attention,
      hint,
      tone: counts.attention > 0 ? "danger" : undefined,
    },
    { id: "waiting", label: "Aguardando", value: counts.waiting, hint },
    {
      id: "in_progress",
      label: "No cartório",
      value: counts.in_progress,
      hint,
    },
    {
      id: "done",
      label: "Confirmados",
      value: counts.done,
      hint,
      tone: counts.done > 0 ? "success" : undefined,
    },
  ];
}

export function registryTimeline(
  item: RegistryRow,
  createdAt: string,
): TimelineStep[] {
  const view = registryView(item);
  const officeState: TimelineStep["state"] =
    view === "done"
      ? "done"
      : item.status === "dispatched"
        ? "current"
        : view === "attention"
          ? item.status === "failed" || item.status === "unknown"
            ? "error"
            : "current"
          : "todo";
  return [
    { title: "Pedido criado", at: createdAt, state: "done" },
    {
      title: "Cotação e envio",
      detail:
        view === "waiting"
          ? registryStatusLabel(item.status)
          : "Enviado ao fornecedor",
      state: view === "waiting" ? "current" : "done",
    },
    {
      title: "No cartório",
      detail: registryStatusLabel(item.status),
      state: officeState,
    },
    {
      title: "Documento confirmado",
      state: view === "done" ? "done" : "todo",
    },
  ];
}
