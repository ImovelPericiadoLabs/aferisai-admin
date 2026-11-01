export type Filter = "all" | "delivered" | "attempted" | "unknown" | "skipped";
export const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "attempted", label: "Falhas" },
  { value: "delivered", label: "Entregues" },
  { value: "unknown", label: "Em conferência" },
  { value: "skipped", label: "Não enviadas" },
];

export function dateLabel(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}
