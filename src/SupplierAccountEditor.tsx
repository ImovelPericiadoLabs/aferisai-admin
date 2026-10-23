import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  getOnrEndpoint,
  resetOnrEndpoint,
  setOnrEndpoint,
  type OnrEndpoint,
  type RegistrySupplierAccount,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  OFFICIAL_ORIGIN,
  WORKER_EXAMPLE,
  changeSummary,
  endpointView,
  validateEndpointForm,
  validateProxyOrigin,
} from "./onr-endpoint-model";
import { RolePicker } from "./RolePicker";
import { supplierLabel, supplierStatusView } from "./supplier-model";
import type { ToastKind } from "./useToast";
import { useDialogFocus } from "./useDialogFocus";
import "./supplier-editor.css";

type Mode = "official" | "proxy";

const MODES = [
  {
    value: "official" as const,
    label: "Portal original",
    summary: "Consulta direto em ridigital.org.br.",
  },
  {
    value: "proxy" as const,
    label: "Proxy protegido",
    summary: "Passa por um Worker que exige uma chave.",
  },
];

function message(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 409)
      return "A conexão mudou enquanto você editava. Os dados foram recarregados; revise e tente de novo.";
    if (cause.status === 422)
      return `${cause.detail} Confirme que o Worker nega acesso sem a chave em todas as rotas.`;
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function SupplierAccountEditor({
  account,
  csrf,
  returnFocus,
  onClose,
  onUnauthorized,
  onToast,
}: {
  account: RegistrySupplierAccount | null;
  csrf: string;
  returnFocus: () => HTMLElement | null;
  onClose: () => void;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const open = account !== null;
  const panelRef = useRef<HTMLElement>(null);
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

  const accountId = account?.id ?? null;

  const apply = useCallback((current: OnrEndpoint) => {
    setEndpoint(current);
    setMode(current.mode);
    setOrigin(current.mode === "proxy" ? current.origin : "");
    setKey("");
    setReplaceKey(false);
    setSubmitted(false);
  }, []);

  const load = useCallback(async () => {
    if (!accountId) return;
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
  }, [accountId, apply, onUnauthorized]);

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

  function close() {
    if (busy) return;
    setKey("");
    onClose();
  }

  useDialogFocus(open, panelRef, () => !confirming && close(), { returnFocus });

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

  const status = account ? supplierStatusView(account.status) : null;

  return (
    <>
      {createPortal(
        <>
          {open && <div className="detail-panel-overlay" onClick={close} />}
          <aside
            ref={panelRef}
            className={`detail-panel detail-panel-wide${open ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-editor-title"
            aria-hidden={!open}
          >
            {account && status && (
              <form
                noValidate
                className="sup-form"
                autoComplete="off"
                onSubmit={(event) => {
                  event.preventDefault();
                  review();
                }}
              >
                <div className="detail-panel-header">
                  <div>
                    <h2 className="prov-title" id="supplier-editor-title">
                      Editar {account.label}
                    </h2>
                    <p className="prov-sub">
                      {supplierLabel(account.provider)} · versão{" "}
                      {account.version} · atualizada em{" "}
                      {dateTime.format(new Date(account.updated_at))}
                    </p>
                  </div>
                  <div className="sup-ed-head-side">
                    <span className={`badge badge-${status.tone}`}>
                      {status.label}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      aria-label="Fechar"
                      disabled={busy}
                      onClick={close}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="detail-panel-body">
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}

                  <section className="detail-panel-section">
                    <div className="sup-ed-section-head">
                      <h3 className="detail-panel-section-title">
                        Conexão em uso
                      </h3>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={loading || busy}
                        onClick={() => void load()}
                      >
                        {loading ? "Atualizando…" : "Atualizar"}
                      </button>
                    </div>
                    {loading && !endpoint ? (
                      <div
                        className="sup-ed-skeleton"
                        role="status"
                        aria-label="Carregando conexão"
                      >
                        <span className="skeleton" />
                        <span className="skeleton" />
                      </div>
                    ) : endpoint && view ? (
                      <dl className="sup-ed-facts">
                        <div>
                          <dt>Origem</dt>
                          <dd>
                            <span className={`badge badge-${view.tone}`}>
                              {view.title}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt>Chave do proxy</dt>
                          <dd>{view.key}</dd>
                        </div>
                        <div className="sup-ed-wide">
                          <dt>Endereço</dt>
                          <dd>
                            <code>{endpoint.origin}</code>
                          </dd>
                        </div>
                      </dl>
                    ) : null}
                  </section>

                  {endpoint && (
                    <section className="detail-panel-section">
                      <h3 className="detail-panel-section-title">
                        Origem das consultas
                      </h3>
                      <RolePicker<Mode>
                        label="Usar"
                        value={mode}
                        options={MODES}
                        disabled={busy}
                        onChange={(next) => {
                          setMode(next);
                          setSubmitted(false);
                        }}
                      />

                      {mode === "proxy" ? (
                        <div className="sup-ed-fields">
                          <div className="form-field">
                            <label
                              className="form-field-label"
                              htmlFor="onr-origin"
                            >
                              URL raiz do Worker
                            </label>
                            <input
                              id="onr-origin"
                              className="input"
                              type="url"
                              inputMode="url"
                              autoComplete="off"
                              spellCheck={false}
                              maxLength={255}
                              placeholder={WORKER_EXAMPLE}
                              value={origin}
                              disabled={busy}
                              aria-invalid={
                                submitted && check.errors.origin
                                  ? true
                                  : undefined
                              }
                              onChange={(event) =>
                                setOrigin(event.target.value)
                              }
                            />
                            {submitted && check.errors.origin ? (
                              <span
                                className="form-hint sup-error"
                                role="alert"
                              >
                                {check.errors.origin}
                              </span>
                            ) : (
                              <span className="form-hint">
                                HTTPS em um Worker sec-devchamps.workers.dev,
                                sem caminho nem parâmetro.
                              </span>
                            )}
                          </div>

                          <div className="form-field">
                            <label
                              className="form-field-label"
                              htmlFor="onr-key"
                            >
                              Chave do Worker
                            </label>
                            {keyConfigured && !replaceKey ? (
                              <div className="sup-ed-keep">
                                <span>
                                  <span aria-hidden="true">●●●●●●●●●●●●</span>{" "}
                                  Chave guardada no cofre
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  disabled={busy}
                                  onClick={() => setReplaceKey(true)}
                                >
                                  Trocar chave
                                </button>
                              </div>
                            ) : (
                              <>
                                <input
                                  id="onr-key"
                                  className="input"
                                  type="password"
                                  autoComplete="off"
                                  spellCheck={false}
                                  maxLength={256}
                                  value={key}
                                  disabled={busy}
                                  aria-invalid={
                                    submitted && check.errors.key
                                      ? true
                                      : undefined
                                  }
                                  onChange={(event) =>
                                    setKey(event.target.value)
                                  }
                                />
                                {submitted && check.errors.key ? (
                                  <span
                                    className="form-hint sup-error"
                                    role="alert"
                                  >
                                    {check.errors.key}
                                  </span>
                                ) : (
                                  <span className="form-hint">
                                    Enviada uma vez, cifrada e nunca mostrada de
                                    novo.
                                  </span>
                                )}
                                {keyConfigured && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm sup-ed-link"
                                    disabled={busy}
                                    onClick={() => {
                                      setReplaceKey(false);
                                      setKey("");
                                    }}
                                  >
                                    Manter a chave atual
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ) : endpoint.mode === "proxy" ? (
                        <p className="alert alert-warning sup-ed-note">
                          Voltar para <code>{OFFICIAL_ORIGIN}</code> remove a
                          chave do proxy do cofre. Para usar o proxy de novo
                          será preciso informar a chave outra vez.
                        </p>
                      ) : (
                        <p className="form-hint sup-ed-note">
                          Esta conta já consulta o portal original. Escolha o
                          proxy protegido para alterar.
                        </p>
                      )}

                      <p className="alert sup-ed-note">
                        A troca vale para execuções iniciadas depois de salvar.
                        Uma compra com resultado incerto continua exigindo
                        conciliação; não há reenvio automático para outra
                        origem.
                      </p>
                    </section>
                  )}
                </div>

                <div className="detail-panel-footer">
                  <button
                    className="btn btn-primary btn-md"
                    disabled={busy || !endpoint || !changed}
                  >
                    {restoring ? "Revisar restauração" : "Revisar e salvar"}
                  </button>
                  <button
                    className="btn btn-ghost btn-md"
                    type="button"
                    disabled={busy}
                    onClick={close}
                  >
                    Fechar
                  </button>
                </div>
              </form>
            )}
          </aside>
        </>,
        document.body,
      )}

      <ConfirmDialog
        open={confirming && endpoint !== null}
        tone={restoring ? "danger" : "primary"}
        title={
          restoring ? "Voltar ao portal original?" : "Salvar esta conexão?"
        }
        description={
          restoring
            ? "A origem passa a ser o portal original e a chave do proxy é removida do cofre."
            : "O backend verifica o Worker (nega sem chave, aceita com chave) antes de gravar."
        }
        details={
          endpoint && account
            ? [
                { label: "Conta", value: account.label },
                ...(restoring
                  ? [
                      { label: "De", value: endpoint.origin },
                      { label: "Para", value: OFFICIAL_ORIGIN },
                    ]
                  : changeSummary(endpoint, {
                      origin: target,
                      replaceKey: keyNeeded,
                      keyConfigured,
                    })),
              ]
            : []
        }
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 10,
          max: 500,
        }}
        confirmLabel={restoring ? "Restaurar origem" : "Verificar e salvar"}
        busy={busy}
        onConfirm={(reason) => void commit(reason)}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
