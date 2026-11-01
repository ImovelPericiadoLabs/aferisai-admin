export function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

export function isExpired(value: string | null | undefined): boolean {
  return Boolean(value && new Date(value).getTime() <= Date.now());
}
