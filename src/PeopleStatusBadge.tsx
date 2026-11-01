import type { Person } from "./people-model";

export function StatusBadge({ status }: { status: Person["status"] }) {
  return (
    <span
      className={`badge ${status === "active" ? "badge-success" : "badge-warning"}`}
    >
      {status === "active" ? "Ativo" : "Suspenso"}
    </span>
  );
}
