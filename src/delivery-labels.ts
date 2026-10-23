export function eventLabel(value: string): string {
  return value === "webhook.test"
    ? "Evento de teste"
    : value === "analysis.completed"
      ? "Análise concluída"
      : "Evento não identificado";
}
export function deliveryTone(value: string): string {
  return value === "delivered"
    ? "badge-success"
    : value === "attempted" || value === "unknown"
      ? "badge-warning"
      : value === "pending"
        ? "badge-info"
        : "badge-neutral";
}
export function deliveryLabel(value: string): string {
  return (
    (
      {
        delivered: "Entregue",
        attempted: "Falha",
        unknown: "Em conferência",
        pending: "Aguardando envio",
        skipped: "Não enviada",
      } as Record<string, string>
    )[value] ?? "Estado desconhecido"
  );
}
