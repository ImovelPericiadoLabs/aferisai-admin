import { ApiError, type RegistrySupplierAccount } from "./api";
import type { SupplierForm } from "./supplier-model";

export type Filter = "" | RegistrySupplierAccount["status"];
export type Pending = {
  action: "activate" | "suspend";
  account: RegistrySupplierAccount;
} | null;

export const filters: { value: Filter; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativas" },
  { value: "suspended", label: "Suspensas" },
];

export const emptyForm: SupplierForm = {
  label: "",
  provider: "onr",
  email: "",
  password: "",
  token: "",
  portalDigest: "",
  stateLoginCpf: "",
  stateLoginPassword: "",
  statePkcs12Cert: "",
  statePkcs12Password: "",
  reason: "",
};

export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function errorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 409)
      return "A conta mudou desde a última leitura. A lista foi atualizada: confira o estado antes de repetir.";
    if (cause.status === 503)
      return `${cause.detail} O cofre pode estar sem a chave privada no servidor.`;
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}
