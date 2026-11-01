export function initials(email: string): string {
  return email.slice(0, 2).toLocaleUpperCase("pt-BR");
}
