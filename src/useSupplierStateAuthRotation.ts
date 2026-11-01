import { useState, type FormEvent } from "react";
import {
  ApiError,
  rotateRegistrySupplierStateAuth,
  type RegistrySupplierAccount,
} from "./api";
import type { ToastKind } from "./useToast";

export function useSupplierStateAuthRotation({
  account,
  csrf,
  busy,
  setBusy,
  onCreated,
  onUnauthorized,
  onToast,
}: {
  account: RegistrySupplierAccount;
  csrf: string;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onCreated: () => void;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [stateAuthOpen, setStateAuthOpen] = useState(false);
  const [stateAuthPassword, setStateAuthPassword] = useState("");
  const [stateAuthCert, setStateAuthCert] = useState("");
  const [stateAuthCertPassword, setStateAuthCertPassword] = useState("");
  const [stateAuthReason, setStateAuthReason] = useState("");
  const [stateAuthError, setStateAuthError] = useState("");

  async function submitStateAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = stateAuthPassword;
    const cert = stateAuthCert.trim();
    const certPassword = stateAuthCertPassword;
    const reason = stateAuthReason.trim();
    const loginMode = password !== "";
    const certMode = cert !== "" || certPassword !== "";
    if (loginMode && password === "") {
      setStateAuthError("Informe a nova senha gov.br.");
      return;
    }
    if (certMode && (cert === "" || certPassword === "")) {
      setStateAuthError("Informe o certificado PKCS#12 e sua senha.");
      return;
    }
    if (loginMode && certMode) {
      setStateAuthError("Escolha login gov.br ou PKCS#12, não os dois.");
      return;
    }
    if (!loginMode && !certMode) {
      setStateAuthError("Informe a nova autenticação estadual.");
      return;
    }
    if (reason.length < 10 || reason.length > 500) {
      setStateAuthError("Informe um motivo entre 10 e 500 caracteres.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setStateAuthError("");
    try {
      await rotateRegistrySupplierStateAuth(
        account.id,
        {
          state_login_cpf: null,
          state_login_password: loginMode ? password : null,
          state_pkcs12_cert: certMode ? cert : null,
          state_pkcs12_password: certMode ? certPassword : null,
          reason,
        },
        csrf,
      );
      setStateAuthPassword("");
      setStateAuthCert("");
      setStateAuthCertPassword("");
      setStateAuthReason("");
      setStateAuthError("");
      setStateAuthOpen(false);
      onToast(
        "Nova autenticação estadual criada em rascunho. A conta atual continua intacta.",
        "success",
      );
      onCreated();
    } catch (cause) {
      setStateAuthPassword("");
      setStateAuthCert("");
      setStateAuthCertPassword("");
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setStateAuthError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível criar a nova autenticação estadual.",
        );
    } finally {
      setBusy(false);
    }
  }

  return {
    stateAuthOpen,
    setStateAuthOpen,
    stateAuthPassword,
    setStateAuthPassword,
    stateAuthCert,
    setStateAuthCert,
    stateAuthCertPassword,
    setStateAuthCertPassword,
    stateAuthReason,
    setStateAuthReason,
    stateAuthError,
    setStateAuthError,
    submitStateAuth,
  };
}

export type SupplierStateAuthState = ReturnType<
  typeof useSupplierStateAuthRotation
>;
