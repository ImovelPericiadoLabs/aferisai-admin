function statusLabel(status: string): string {
  if (status === "active") return "Ativo";
  if (status === "suspended") return "Suspenso";
  return "Estado não informado";
}

export function DirectoryStatus({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "badge-success"
      : status === "suspended"
        ? "badge-warning"
        : "badge-neutral";
  return <span className={`badge ${tone}`}>{statusLabel(status)}</span>;
}
