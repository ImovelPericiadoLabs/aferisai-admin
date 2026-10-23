import { ApiError } from "./api";

export function deletionBlockMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 409)
      return "Esta aplicação já foi excluída. Atualize a lista.";
    if (cause.status === 404) return "Esta aplicação não existe mais.";
    if (cause.status === 403)
      return "Somente um administrador ativo pode excluir uma aplicação.";
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}
