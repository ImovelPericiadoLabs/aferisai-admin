import { useEffect, useState } from "react";
import {
  ApiError,
  issuePartnerCredential,
  listPartnerCredentials,
  revokePartnerCredential,
  type IssuedPartnerCredential,
  type PartnerCredential,
} from "./api";
import { uuidv7 } from "./uuidv7";

export type CredentialManagementOptions = {
  applicationId: string;
  csrfToken: string;
  availableScopes: string[];
  channel: "team" | "partner";
  onUnauthorized: () => void;
  onChanged?: () => void;
};

export function useCredentialManagement({
  applicationId,
  csrfToken,
  availableScopes,
  channel,
  onUnauthorized,
  onChanged,
}: CredentialManagementOptions) {
  const [items, setItems] = useState<PartnerCredential[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState(false);
  const [notice, setNotice] = useState("");
  const [issued, setIssued] = useState<IssuedPartnerCredential | null>(null);
  const [uncertain, setUncertain] = useState<string | null>(null);
  const [reconciled, setReconciled] = useState(false);
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [issueReason, setIssueReason] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "application:read",
  ]);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let live = true;
    listPartnerCredentials(applicationId, undefined, channel)
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        setCursor(result.next_cursor);
        setListError(false);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else {
          setListError(true);
          setError("Não foi possível consultar as credenciais.");
        }
      })
      .finally(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [applicationId, onUnauthorized, channel]);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const result = await listPartnerCredentials(
        applicationId,
        undefined,
        channel,
      );
      setItems(result.items);
      setCursor(result.next_cursor);
      setLoaded(true);
      setListError(false);
      if (uncertain) setReconciled(true);
      onChanged?.();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        setListError(true);
        setError("Não foi possível atualizar a lista de credenciais.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);
    setError("");
    try {
      const result = await listPartnerCredentials(
        applicationId,
        cursor,
        channel,
      );
      setItems((current) => [...current, ...result.items]);
      setCursor(result.next_cursor);
      if (uncertain) setReconciled(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError("Não foi possível carregar mais credenciais.");
    } finally {
      setBusy(false);
    }
  }

  async function issue() {
    if (!name.trim()) {
      setFormError("Dê um nome para identificar o sistema.");
      return;
    }
    if (
      selectedScopes.length === 0 ||
      selectedScopes.some((scope) => !availableScopes.includes(scope))
    ) {
      setFormError("Selecione pelo menos uma permissão disponível.");
      return;
    }
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1) {
      setFormError("Escolha uma validade.");
      return;
    }
    const issueRequestId = uuidv7();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await issuePartnerCredential(
        applicationId,
        issueRequestId,
        csrfToken,
        {
          name: name.trim(),
          expires_in_days: expiresInDays,
          scopes: selectedScopes,
        },
        channel,
        issueReason,
      );
      setIssued(result);
      setConfirmIssue(false);
      setName("");
      setIssueReason("");
      await refresh();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
      } else if (
        !(cause instanceof ApiError) ||
        cause.status >= 500 ||
        cause.code === "integration.credential_issue_repeated"
      ) {
        setConfirmIssue(false);
        setUncertain(issueRequestId);
        setReconciled(false);
        setError(
          "Não foi possível confirmar a emissão. Atualize a lista e procure a tentativa antes de qualquer nova emissão.",
        );
      } else {
        setError(cause.detail);
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(credentialId: string, reason: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await revokePartnerCredential(
        applicationId,
        credentialId,
        csrfToken,
        channel,
        reason,
      );
      setConfirmRevoke(null);
      setDetailId(null);
      if (
        items.find((item) => item.id === credentialId)?.issue_request_id ===
        uncertain
      ) {
        setUncertain(null);
        setReconciled(false);
      }
      setNotice(
        "Credencial revogada. Tokens emitidos com ela deixam de funcionar.",
      );
      await refresh();
    } catch (cause) {
      setConfirmRevoke(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível confirmar a revogação. Atualize a lista antes de repetir.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function copyClientId(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        "Não foi possível copiar. Selecione o identificador e copie manualmente.",
      );
    }
  }

  function openIssue() {
    setSelectedScopes(
      availableScopes.includes("application:read")
        ? ["application:read"]
        : availableScopes.slice(0, 1),
    );
    setFormError("");
    setError("");
    setConfirmIssue(true);
  }

  function closeIssue() {
    if (busy) return;
    setConfirmIssue(false);
    setFormError("");
  }
  return {
    busy,
    closeIssue,
    confirmIssue,
    confirmRecovery,
    confirmRevoke,
    copied,
    copyClientId,
    cursor,
    detailId,
    error,
    expiresInDays,
    formError,
    issue,
    issueReason,
    issued,
    items,
    listError,
    loadMore,
    loaded,
    name,
    notice,
    openIssue,
    reconciled,
    refresh,
    revoke,
    selectedScopes,
    setConfirmRecovery,
    setConfirmRevoke,
    setDetailId,
    setExpiresInDays,
    setFormError,
    setIssueReason,
    setIssued,
    setName,
    setReconciled,
    setSelectedScopes,
    setUncertain,
    uncertain,
  };
}
