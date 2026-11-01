import { ApiError } from "./api";

export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function problem(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.detail : fallback;
}
