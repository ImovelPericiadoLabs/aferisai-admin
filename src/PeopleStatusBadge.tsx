import type { Person } from "./people-model";

export function StatusBadge({ status }: { status: Person["status"] }) {
  return (
    <span
      className={`badge ${status === "active" ? "badge-success" : status === "deleted" ? "badge-neutral" : "badge-warning"}`}
    >
      {status === "active"
        ? "Ativo"
        : status === "deleted"
          ? "Anonimizado"
          : "Suspenso"}
    </span>
  );
}
