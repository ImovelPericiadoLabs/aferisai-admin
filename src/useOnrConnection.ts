import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getOnrEndpoint,
  resetOnrEndpoint,
  setOnrEndpoint,
  type OnrEndpoint,
} from "./api";
import {
  endpointView,
  validateEndpointForm,
  validateProxyOrigin,
} from "./onr-endpoint-model";
import { message, type Mode } from "./supplier-editor-model";
import type { ToastKind } from "./useToast";

export function useOnrConnection({
  accountId,
  accountProvider,
  csrf,
  onUnauthorized,
  onToast,
}: {
  accountId: string | null;
  accountProvider: string | null;
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [endpoint, setEndpoint] = useState<OnrEndpoint | null>(null);
  const [mode, setMode] = useState<Mode>("official");
  const [origin, setOrigin] = useState("");
  const [key, setKey] = useState("");
  const [replaceKey, setReplaceKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [connectionOpen, setConnectionOpen] = useState(false);

  const apply = useCallback((current: OnrEndpoint) => {
    setEndpoint(current);
    setMode(current.mode);
    setOrigin(current.mode === "proxy" ? current.origin : "");
    setKey("");
    setReplaceKey(false);
    setSubmitted(false);
  }, []);

  const load = useCallback(async () => {
    if (!accountId || accountProvider !== "onr") return;
    setLoading(true);
    try {
      apply(await getOnrEndpoint(accountId));
      setError("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, [accountId, accountProvider, apply, onUnauthorized]);

  useEffect(() => {
    if (!accountId) {
      queueMicrotask(() => {
        setEndpoint(null);
        setError("");
        setConfirming(false);
      });
      return;
    }
    queueMicrotask(() => void load());
  }, [accountId, load]);

  const keyConfigured = endpoint?.proxy_key_configured ?? false;
  const view = endpoint ? endpointView(endpoint) : null;
  const check = validateEndpointForm({
    origin,
    key,
    keyConfigured,
    replaceKey,
  });
  const normalized = validateProxyOrigin(origin);
  const target = normalized.ok ? normalized.origin : origin.trim();
  const changed =
    endpoint !== null &&
    (mode === "official"
      ? endpoint.mode === "proxy"
      : endpoint.mode !== "proxy" || replaceKey || target !== endpoint.origin);
  const restoring = mode === "official";
  const keyNeeded = !keyConfigured || replaceKey;

  function review() {
    setSubmitted(true);
    if (!changed) return;
    if (!restoring && !check.ok) return;
    setConfirming(true);
  }

  async function commit(reason: string) {
    if (!accountId || !endpoint) return;
    setBusy(true);
    try {
      const updated = restoring
        ? await resetOnrEndpoint(accountId, endpoint.version, reason, csrf)
        : await setOnrEndpoint(
            accountId,
            target,
            keyNeeded ? key : null,
            endpoint.version,
            reason,
            csrf,
          );
      apply(updated);
      setConfirming(false);
      setConnectionOpen(false);
      setError("");
      onToast(
        restoring
          ? "Origem oficial restaurada para novas execuções."
          : "Conexão atualizada para novas execuções.",
        "success",
      );
    } catch (cause) {
      setKey("");
      setConfirming(false);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        setError(message(cause));
        if (cause instanceof ApiError && cause.status === 409) await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return {
    endpoint,
    mode,
    setMode,
    origin,
    setOrigin,
    key,
    setKey,
    replaceKey,
    setReplaceKey,
    loading,
    busy,
    error,
    submitted,
    setSubmitted,
    confirming,
    setConfirming,
    connectionOpen,
    setConnectionOpen,
    keyConfigured,
    view,
    check,
    target,
    changed,
    restoring,
    keyNeeded,
    load,
    review,
    commit,
  };
}

export type OnrConnection = ReturnType<typeof useOnrConnection>;
