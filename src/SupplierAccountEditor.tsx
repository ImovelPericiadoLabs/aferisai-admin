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
import { RegistryVisualizationTariffs } from "./RegistryVisualizationTariffs";
import { AccountOverview } from "./AccountOverview";
import { PriceComposition } from "./PriceComposition";
import { readiness } from "./account-model";
import { useAccountSnapshot } from "./useAccountSnapshot";
import { useNow } from "./useNow";
import { RegistryCommercialTerms } from "./RegistryCommercialTerms";
import { RegistryOptionalTariffs } from "./RegistryOptionalTariffs";
import { SupplierCredentialRenewal } from "./SupplierCredentialRenewal";
import { InlinePanel, Metrics, SettingCard } from "./SupplierUi";
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
  accounts,
  csrf,
  returnFocus,
  onClose,
  onUnauthorized,
  onToast,
  onAccountsChanged,
  onStatusAction,
}: {
  account: RegistrySupplierAccount | null;
  accounts: RegistrySupplierAccount[];
  csrf: string;
  returnFocus: () => HTMLElement | null;
  onClose: () => void;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
  onAccountsChanged: () => void;
  onStatusAction: (
    action: "activate" | "suspend",
    account: RegistrySupplierAccount,
  ) => void;
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
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [tab, setTab] = useState<
    | "overview"
    | "credentials"
    | "connection"
    | "tariffs"
    | "commercial"
    | "composition"
  >("overview");

  const accountId = account?.id ?? null;
  const accountProvider = account?.provider ?? null;
  const now = useNow();
  const { snapshot, reload: reloadSnapshot } = useAccountSnapshot(
    account,
    onUnauthorized,
  );
  useEffect(() => {
    if (accountId) reloadSnapshot();
  }, [tab, accountId, reloadSnapshot]);

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

  function close() {
    if (busy) return;
    setKey("");
    setTab("overview");
    onClose();
  }

  useDialogFocus(open, panelRef, () => !confirming && close(), { returnFocus });

  const ready = account ? readiness(account, snapshot, now) : [];
  const readyState = (id: string) => ready.find((row) => row.id === id)?.state;
  const groups: {
    title: string;
    items: { id: typeof tab; label: string; hint: string; dot?: string }[];
  }[] = account
    ? [
        {
          title: "Geral",
          items: [
            {
              id: "overview",
              label: "Visão geral",
              hint: "Prontidão e números",
            },
          ],
        },
        {
          title: "Conta",
          items: [
            {
              id: "credentials",
              label: "Credenciais",
              hint: "Login e vínculo",
              dot: readyState("credential"),
            },
            ...(account.provider === "onr"
              ? [
                  {
                    id: "connection" as const,
                    label: "Conexão",
                    hint: "Origem das consultas",
                    dot: readyState("connection"),
                  },
                ]
              : []),
          ],
        },
        {
          title: "Preços",
          items: [
            {
              id: "tariffs",
              label: "Tarifas da API",
              hint: "Custo do fornecedor",
              dot: readyState("tariff"),
            },
            ...(account.provider === "onr"
              ? [
                  {
                    id: "commercial" as const,
                    label: "Condições comerciais",
                    hint: "Margens e impostos",
                    dot: readyState("terms"),
                  },
                  {
                    id: "composition" as const,
                    label: "Composição do preço",
                    hint: "Do custo cru ao preço",
                  },
                ]
              : []),
          ],
        },
      ]
    : [];

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

  const status = account ? supplierStatusView(account.status) : null;
  const initials = account
    ? account.label
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("")
    : "";

  return (
    <>
      {createPortal(
        <>
          {open && <div className="detail-panel-overlay" onClick={close} />}
          <aside
            ref={panelRef}
            className={`detail-panel sup-ed-panel${open ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-editor-title"
            aria-hidden={!open}
          >
            {account && status && (
              <div className="sup-ed-shell">
                <header className="sup-ed-header">
                  <span className="sup-ed-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <div className="sup-ed-heading">
                    <h2 id="supplier-editor-title" className="sup-clip">
                      {account.label}
                    </h2>
                    <p className="sup-clip">
                      {supplierLabel(account.provider)} · versão{" "}
                      {account.version} · atualizada em{" "}
                      {dateTime.format(new Date(account.updated_at))}
                    </p>
                  </div>
                  <span className={`badge badge-${status.tone}`}>
                    {status.label}
                  </span>
                  {account.status !== "active" ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-md"
                      aria-haspopup="dialog"
                      onClick={() => onStatusAction("activate", account)}
                    >
                      Ativar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost-danger btn-md"
                      aria-haspopup="dialog"
                      onClick={() => onStatusAction("suspend", account)}
                    >
                      Suspender
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar"
                    disabled={busy}
                    onClick={close}
                  >
                    ✕
                  </button>
                </header>

                <div className="sup-ed-layout">
                  <nav
                    className="sup-ed-nav"
                    aria-label="Configurações da conta"
                  >
                    {groups.map((group) => (
                      <div key={group.title} className="sup-ed-group">
                        <p className="sup-ed-group-title">{group.title}</p>
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="sup-ed-nav-item"
                            aria-current={tab === item.id ? "page" : undefined}
                            onClick={() => setTab(item.id)}
                          >
                            <span>{item.label}</span>
                            {item.dot && (
                              <i
                                className="sup-dot"
                                data-state={item.dot}
                                aria-hidden="true"
                              />
                            )}
                            <small>{item.hint}</small>
                          </button>
                        ))}
                      </div>
                    ))}
                  </nav>

                  <div className="sup-ed-content">
                    {tab === "overview" && (
                      <AccountOverview
                        account={account}
                        snapshot={snapshot}
                        now={now}
                        onGoto={(section) => setTab(section)}
                      />
                    )}
                    {tab === "credentials" && (
                      <SupplierCredentialRenewal
                        key={account.id}
                        account={account}
                        accounts={accounts}
                        csrf={csrf}
                        onCreated={onAccountsChanged}
                        onUnauthorized={onUnauthorized}
                        onToast={onToast}
                      />
                    )}

                    {tab === "connection" && account.provider === "onr" && (
                      <>
                        <SettingCard
                          title="Conexão com o portal"
                          help="Define por onde as consultas desta conta chegam ao RI Digital. A troca vale para execuções iniciadas depois de salvar; compras com resultado incerto continuam indo para conciliação, sem reenvio automático."
                          badge={
                            view && (
                              <span className={`badge badge-${view.tone}`}>
                                {view.title}
                              </span>
                            )
                          }
                          actions={
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost btn-md"
                                disabled={loading || busy}
                                onClick={() => void load()}
                              >
                                {loading ? "Atualizando…" : "Atualizar"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-md"
                                aria-haspopup="dialog"
                                disabled={!endpoint}
                                onClick={() => {
                                  setSubmitted(false);
                                  setConnectionOpen(true);
                                }}
                              >
                                Alterar conexão
                              </button>
                            </>
                          }
                        >
                          {error && !connectionOpen && (
                            <div className="alert alert-danger" role="alert">
                              {error}
                            </div>
                          )}
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
                            <>
                              <Metrics
                                items={[
                                  { label: "Origem", value: view.title },
                                  { label: "Chave do proxy", value: view.key },
                                  { label: "Versão", value: endpoint.version },
                                ]}
                              />
                              <p className="sup-muted sup-clip">
                                Endereço <code>{endpoint.origin}</code>
                              </p>
                            </>
                          ) : null}
                        </SettingCard>
                        <InlinePanel
                          open={connectionOpen && endpoint !== null}
                          title="Alterar conexão"
                          onClose={() => !busy && setConnectionOpen(false)}
                          footer={
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost btn-md"
                                disabled={busy}
                                onClick={() => setConnectionOpen(false)}
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                form="onr-connection-form"
                                className="btn btn-primary btn-md"
                                disabled={busy || !changed}
                              >
                                {restoring
                                  ? "Revisar restauração"
                                  : "Revisar e salvar"}
                              </button>
                            </>
                          }
                        >
                          {error && (
                            <div className="alert alert-danger" role="alert">
                              {error}
                            </div>
                          )}
                          {endpoint && (
                            <form
                              id="onr-connection-form"
                              noValidate
                              autoComplete="off"
                              className="sup-form-grid"
                              onSubmit={(event) => {
                                event.preventDefault();
                                review();
                              }}
                            >
                              <div className="sup-span">
                                <RolePicker<Mode>
                                  label="Origem das consultas"
                                  value={mode}
                                  options={MODES}
                                  disabled={busy}
                                  onChange={(next) => {
                                    setMode(next);
                                    setSubmitted(false);
                                  }}
                                />
                              </div>
                              {mode === "proxy" ? (
                                <>
                                  <div className="form-field sup-span">
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
                                        HTTPS em um Worker
                                        sec-devchamps.workers.dev, sem caminho.
                                      </span>
                                    )}
                                  </div>
                                  <div className="form-field sup-span">
                                    <label
                                      className="form-field-label"
                                      htmlFor="onr-key"
                                    >
                                      Chave do Worker
                                    </label>
                                    {keyConfigured && !replaceKey ? (
                                      <div className="sup-ed-keep">
                                        <span>
                                          <span aria-hidden="true">
                                            ●●●●●●●●●●●●
                                          </span>{" "}
                                          Guardada no cofre
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
                                            Enviada uma vez, cifrada e nunca
                                            mostrada de novo.
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
                                </>
                              ) : endpoint.mode === "proxy" ? (
                                <p className="alert alert-warning sup-span">
                                  Voltar para <code>{OFFICIAL_ORIGIN}</code>{" "}
                                  remove a chave do proxy do cofre.
                                </p>
                              ) : (
                                <p className="sup-muted sup-span">
                                  Esta conta já consulta o portal original.
                                </p>
                              )}
                            </form>
                          )}
                        </InlinePanel>
                      </>
                    )}

                    {tab === "tariffs" && (
                      <>
                        <RegistryVisualizationTariffs
                          key={account.id}
                          account={account}
                          accounts={accounts}
                          csrf={csrf}
                          onUnauthorized={onUnauthorized}
                          onToast={onToast}
                        />
                        <RegistryOptionalTariffs
                          key={`${account.id}-optional`}
                          account={account}
                          accounts={accounts}
                          csrf={csrf}
                          onUnauthorized={onUnauthorized}
                          onToast={onToast}
                        />
                      </>
                    )}

                    {tab === "commercial" && account.provider === "onr" && (
                      <RegistryCommercialTerms
                        key={account.id}
                        accountId={account.id}
                        active={account.status === "active"}
                        csrf={csrf}
                        onUnauthorized={onUnauthorized}
                        onToast={onToast}
                      />
                    )}

                    {tab === "composition" && account.provider === "onr" && (
                      <PriceComposition
                        key={account.id}
                        accountId={account.id}
                        terms={snapshot.terms}
                        onUnauthorized={onUnauthorized}
                      />
                    )}
                  </div>
                </div>
              </div>
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
