import { permissions } from "./integration-catalog";
import { applicationPermissionDescription } from "./display-labels";

export type RegistrableCode = {
  code: string;
  title: string;
  description: string;
};

/** Implemented codes (the only ones the backend accepts) that the catalog still lacks. */
export function registrableCodes(registered: string[]): RegistrableCode[] {
  return permissions
    .filter((entry) => entry.status === "implemented")
    .filter((entry) => !registered.includes(entry.code))
    .map((entry) => ({
      code: entry.code,
      title: entry.title,
      description: applicationPermissionDescription(entry.code),
    }));
}

export function registrationErrorMessage(
  status: number,
  detail: string,
): string {
  if (status === 409) return "Esta ação já está cadastrada. Atualize a tela.";
  if (status === 422)
    return "Esse código ainda não protege nenhuma operação implementada.";
  if (status === 403)
    return "Só gestor ou administrador cadastra ações, e a parceria precisa estar ativa.";
  return detail;
}
