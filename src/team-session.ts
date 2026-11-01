import { ApiError, type TeamMember } from "./api";

export type Session = { csrf: string; member: TeamMember };

export function teamErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.detail;
  return "Não foi possível conectar à API. Confira a configuração e tente novamente.";
}
