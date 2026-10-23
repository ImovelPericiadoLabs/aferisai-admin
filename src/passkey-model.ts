import { ApiError } from "./api";

export const MAX_PASSKEYS = 5;

export function passkeyUsage(count: number): {
  count: number;
  max: number;
  full: boolean;
  label: string;
} {
  return {
    count,
    max: MAX_PASSKEYS,
    full: count >= MAX_PASSKEYS,
    label: `${count} de ${MAX_PASSKEYS} chaves`,
  };
}

export function passkeyErrorKind(
  cause: unknown,
): "cancelled" | "unauthorized" | "failed" {
  if (cause instanceof ApiError)
    return cause.status === 401 ? "unauthorized" : "failed";
  const name =
    typeof cause === "object" && cause !== null && "name" in cause
      ? String((cause as { name: unknown }).name)
      : "";
  return name === "NotAllowedError" || name === "AbortError"
    ? "cancelled"
    : "failed";
}

export function revokeWarning(totalKeys: number): string {
  return totalKeys <= 1
    ? "Esta é a sua última chave. Depois de revogar, você volta a entrar só com senha e código do autenticador."
    : "A chave deixa de funcionar imediatamente neste e em qualquer dispositivo que a use.";
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function lastUsedLabel(lastUsedAt: string | null): string {
  return lastUsedAt === null
    ? "Nunca usada"
    : dateTime.format(new Date(lastUsedAt));
}
