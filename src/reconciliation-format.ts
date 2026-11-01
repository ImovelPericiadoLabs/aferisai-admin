export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const shortId = (id: string) => id.slice(-8);
export type ReconciliationScope = "active" | "refunded";
