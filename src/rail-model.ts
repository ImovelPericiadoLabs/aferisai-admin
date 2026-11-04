import type { Journey } from "./case-journey-model";

/** The five stops of a purchase, left to right. */
export type RailId =
  "order" | "payment" | "documents" | "analysis" | "delivery";

export const RAIL_LABELS: Record<RailId, string> = {
  order: "Pedido",
  payment: "Pagamento",
  documents: "Documentos",
  analysis: "Análise",
  delivery: "Entrega",
};

export const RAIL_ORDER: RailId[] = [
  "order",
  "payment",
  "documents",
  "analysis",
  "delivery",
];

export type RailState = "done" | "current" | "problem" | "pending";

export type RailStep = {
  id: RailId;
  label: string;
  state: RailState;
  detail?: string;
};

/** A task that has no purchase data still sits at one stop; the stop before it is done, after it is pending. */
export function railAt(at: RailId, problem: boolean): RailStep[] {
  const index = RAIL_ORDER.indexOf(at);
  return RAIL_ORDER.map((id, position) => ({
    id,
    label: RAIL_LABELS[id],
    state:
      position < index
        ? "done"
        : position === index
          ? problem
            ? "problem"
            : "current"
          : "pending",
  }));
}

/** The real state of every stop of a purchase that has its documents. */
export function railOf(journey: Journey): RailStep[] {
  const documents = journey.stages.find((stage) => stage.id === "documents");
  const analysis = journey.stages.find((stage) => stage.id === "analysis");
  const delivered =
    journey.delivered === journey.total &&
    journey.analysesDone === journey.total;
  return [
    { id: "order", label: RAIL_LABELS.order, state: "done" },
    { id: "payment", label: RAIL_LABELS.payment, state: "done" },
    {
      id: "documents",
      label: RAIL_LABELS.documents,
      state: documents?.state ?? "pending",
      detail: documents?.detail,
    },
    {
      id: "analysis",
      label: RAIL_LABELS.analysis,
      state: analysis?.state ?? "pending",
      detail: analysis?.detail,
    },
    {
      id: "delivery",
      label: RAIL_LABELS.delivery,
      state: delivered ? "done" : "pending",
    },
  ];
}

/** Where a case is on the rail: the first stop that is not done. */
export function railPosition(steps: RailStep[]): {
  at: RailId;
  problem: boolean;
} {
  const open = steps.find((step) => step.state !== "done");
  return open
    ? { at: open.id, problem: open.state === "problem" }
    : { at: "delivery", problem: false };
}
