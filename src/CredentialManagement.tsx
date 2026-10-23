import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";
import {
  ApiError,
  issuePartnerCredential,
  listPartnerCredentials,
  revokePartnerCredential,
  type IssuedPartnerCredential,
  type PartnerCredential,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { Checkbox } from "./controls";
import { IntegrationIcon } from "./IntegrationIcon";
import { PermissionIcon } from "./PermissionIcon";
import { SecretReveal } from "./SecretReveal";
import { credentialState, expiryNote } from "./credential-model";
import { uuidv7 } from "./uuidv7";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";

type Props = {
  applicationId: string;
  csrfToken: string;
  canIssue: boolean;
  availableScopes?: string[];
  permissionDescriptions?: Record<string, string>;
  channel?: "team" | "partner";
  onUnauthorized: () => void;
  onChanged?: () => void;
};

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

function isExpired(value: string | null | undefined): boolean {
  return Boolean(value && new Date(value).getTime() <= Date.now());
}

export function CredentialManagement({
  applicationId,
  csrfToken,
  canIssue,
  availableScopes = ["application:read"],
  permissionDescriptions = {},
  channel = "team",
  onUnauthorized,
  onChanged,
}: Props) {
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
  const [copied, setCopied] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
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
      );
      setIssued(result);
      setConfirmIssue(false);
      setName("");
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

  async function revoke(credentialId: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await revokePartnerCredential(
        applicationId,
        credentialId,
        csrfToken,
        channel,
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

  const activeCount = items.filter(
    (item) => item.status === "active" && !isExpired(item.expires_at),
  ).length;

  const revokeTarget = items.find((item) => item.id === confirmRevoke);

  const panelRef = useRef<HTMLElement>(null);
  useDialogFocus(confirmIssue, panelRef, () => closeIssue());
  const detail = items.find((item) => item.id === detailId) ?? null;
  useDialogFocus(detail !== null, detailRef, () => setDetailId(null), {
    returnFocus: () =>
      document.querySelector<HTMLElement>(`[data-credential-id="${detailId}"]`),
  });

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

  const canOpenIssue =
    loaded && !listError && canIssue && !uncertain && !issued;
  const issueFull = loaded && activeCount >= 2;
  const orphan = items.find((item) => item.issue_request_id === uncertain);

  return (
    <section className="cred" aria-label="Credenciais da aplicação">
      <header className="cred-head">
        <div>
          <h3 className="appws-section-title">Credenciais</h3>
          <p className="form-hint">
            Troque o segredo antes de revogar o anterior. Até duas credenciais
            podem estar ativas durante a troca.
          </p>
        </div>
        <div className="appdir-actions">
          <button
            className="btn btn-ghost btn-md"
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Atualizar
          </button>
          {canOpenIssue && !issueFull && (
            <button
              className="btn btn-primary btn-md"
              type="button"
              disabled={busy}
              onClick={openIssue}
            >
              <IntegrationIcon name="plus" size={14} /> Emitir credencial
            </button>
          )}
        </div>
      </header>
      {!loaded && (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {uncertain && (
        <div className="alert alert-warning cred-recovery" role="status">
          <strong>Emissão com resultado desconhecido</strong>
          <p>
            Identificador da tentativa: <code>{uncertain}</code>
          </p>
          {orphan ? (
            <p>
              A credencial <code>{orphan.client_id}</code> foi registrada, mas o
              segredo não pode ser recuperado. Revogue-a antes de emitir outra.
            </p>
          ) : reconciled ? (
            <p>
              Esta tentativa não aparece na lista carregada. Consulte as demais
              páginas e atualize novamente antes de encerrar a verificação.
            </p>
          ) : (
            <p>
              Atualize a lista para verificar se a credencial foi registrada.
            </p>
          )}
          {reconciled && !orphan && !cursor && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => setConfirmRecovery(true)}
            >
              Revisei toda a lista; encerrar verificação
            </button>
          )}
        </div>
      )}
      {loaded && items.length === 0 && !error && (
        <div className="onb card" role="status">
          <span className="onb-badge" aria-hidden="true">
            <IntegrationIcon name="key" size={28} />
          </span>
          <h4>Emita sua primeira credencial</h4>
          <p className="onb-lead">
            A credencial identifica seus sistemas nas chamadas à API. O segredo
            aparece uma única vez, então prepare um cofre antes de começar.
          </p>
          {canOpenIssue && (
            <button
              className="btn btn-primary btn-lg onb-cta"
              type="button"
              disabled={busy}
              onClick={openIssue}
            >
              Emitir credencial
            </button>
          )}
        </div>
      )}
      {items.length > 0 && (
        <ul className="cred-list" aria-label="Credenciais">
          {items.map((credential) => {
            const state = credentialState(credential);
            const scopes = credential.scopes ?? [];
            return (
              <li key={credential.id}>
                <button
                  type="button"
                  className="cred-row"
                  data-state={state.key}
                  data-credential-id={credential.id}
                  aria-haspopup="dialog"
                  onClick={() => setDetailId(credential.id)}
                >
                  <span className="cred-key" aria-hidden="true">
                    <IntegrationIcon name="key" size={16} />
                  </span>
                  <span className="cred-main">
                    <strong>{credential.name || "Credencial sem nome"}</strong>
                    <code>{credential.client_id}</code>
                  </span>
                  <span className="cred-scopes-count">
                    {scopes.length
                      ? `${scopes.length} permiss${scopes.length === 1 ? "ão" : "ões"}`
                      : "—"}
                  </span>
                  <span className="cred-expiry">{expiryNote(credential)}</span>
                  <span className={`badge badge-${state.tone}`}>
                    {state.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {cursor && (
        <button
          className="btn btn-secondary btn-md cred-more"
          type="button"
          disabled={busy}
          onClick={() => void loadMore()}
        >
          Carregar mais
        </button>
      )}
      {loaded && activeCount >= 2 && (
        <div className="alert" role="note">
          Limite de duas credenciais ativas. Revogue uma antiga antes de emitir
          outra.
        </div>
      )}
      {loaded && !canIssue && (
        <div className="alert" role="note">
          A organização e a aplicação precisam estar ativas para emitir uma
          credencial.
        </div>
      )}

      {createPortal(
        <>
          {detail && (
            <div
              className="detail-panel-overlay"
              onClick={() => setDetailId(null)}
            />
          )}
          <aside
            ref={detailRef}
            className={`detail-panel${detail ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cred-detail-title"
            aria-hidden={!detail}
          >
            {detail && (
              <>
                <div className="detail-panel-header">
                  <div>
                    <h2 className="rules-panel-title" id="cred-detail-title">
                      {detail.name || "Credencial sem nome"}
                    </h2>
                    <div className="rules-panel-badges">
                      <span
                        className={`badge badge-${credentialState(detail).tone}`}
                      >
                        {credentialState(detail).label}
                      </span>
                      <span className="rules-panel-sub">
                        {expiryNote(detail)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar"
                    onClick={() => setDetailId(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="detail-panel-body">
                  <section className="detail-panel-section">
                    <h3 className="detail-panel-section-title">
                      Identificação
                    </h3>
                    <div className="cred-id-row">
                      <code>{detail.client_id}</code>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void copyClientId(detail.client_id)}
                      >
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <p className="form-hint">
                      O segredo não pode ser consultado de novo. Se foi perdido,
                      emita uma nova credencial e revogue esta.
                    </p>
                  </section>
                  <section className="detail-panel-section">
                    <h3 className="detail-panel-section-title">
                      Ciclo de vida
                    </h3>
                    <dl className="detail-panel-field">
                      <dt>Emitida em</dt>
                      <dd>{dateLabel(detail.created_at)}</dd>
                      <dt>Vencimento</dt>
                      <dd>
                        {detail.expires_at
                          ? dateLabel(detail.expires_at)
                          : "Sem prazo definido"}
                      </dd>
                      {detail.revoked_at && (
                        <>
                          <dt>Revogada em</dt>
                          <dd>{dateLabel(detail.revoked_at)}</dd>
                        </>
                      )}
                    </dl>
                  </section>
                  <section className="detail-panel-section">
                    <h3 className="detail-panel-section-title">Permissões</h3>
                    {detail.scopes?.length ? (
                      <ul className="cred-scope-chips">
                        {detail.scopes.map((scope) => (
                          <li key={scope}>
                            <PermissionIcon code={scope} />
                            <span>
                              <strong>
                                {applicationPermissionLabel(scope)}
                              </strong>
                              <small>
                                {applicationPermissionDescription(
                                  scope,
                                  permissionDescriptions[scope],
                                )}
                              </small>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="form-hint">
                        Esta credencial não informa permissões.
                      </p>
                    )}
                  </section>
                  {detail.issue_request_id && (
                    <section className="detail-panel-section">
                      <h3 className="detail-panel-section-title">Técnico</h3>
                      <dl className="detail-panel-field">
                        <dt>Emissão</dt>
                        <dd>
                          <code>{detail.issue_request_id}</code>
                        </dd>
                      </dl>
                    </section>
                  )}
                </div>
                {detail.status === "active" && (
                  <div className="detail-panel-footer">
                    <button
                      type="button"
                      className="btn btn-danger btn-md"
                      disabled={busy}
                      onClick={() => setConfirmRevoke(detail.id)}
                    >
                      Revogar credencial
                    </button>
                  </div>
                )}
              </>
            )}
          </aside>
        </>,
        document.body,
      )}

      {createPortal(
        <>
          {confirmIssue && (
            <div className="detail-panel-overlay" onClick={closeIssue} />
          )}
          <aside
            ref={panelRef}
            className={`detail-panel${confirmIssue ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cred-form-title"
            aria-hidden={!confirmIssue}
          >
            {confirmIssue && (
              <>
                <div className="detail-panel-header">
                  <div>
                    <h2 className="rules-panel-title" id="cred-form-title">
                      Emitir credencial
                    </h2>
                    <p className="rules-panel-sub">
                      O segredo completo aparece uma única vez.
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar"
                    onClick={closeIssue}
                  >
                    ✕
                  </button>
                </div>
                <form
                  id="cred-issue-form"
                  className="detail-panel-body"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void issue();
                  }}
                >
                  {(formError || error) && (
                    <div className="alert alert-danger form-alert" role="alert">
                      {formError || error}
                    </div>
                  )}
                  <fieldset className="form-section">
                    <legend className="form-section-title">
                      Identificação
                    </legend>
                    <div className="form-field">
                      <label
                        className="form-field-label"
                        htmlFor="credential-name"
                      >
                        Nome da credencial
                      </label>
                      <input
                        id="credential-name"
                        className="input"
                        value={name}
                        maxLength={80}
                        placeholder="Ex.: Sistema de produção"
                        onChange={(event) => {
                          setName(event.target.value);
                          setFormError("");
                        }}
                        required
                      />
                      <span className="form-hint">
                        Identifique o sistema que vai usar esta credencial.
                      </span>
                    </div>
                    <div className="form-field">
                      <label
                        className="form-field-label"
                        htmlFor="credential-expiry"
                      >
                        Validade
                      </label>
                      <select
                        id="credential-expiry"
                        className="input"
                        value={expiresInDays}
                        onChange={(event) =>
                          setExpiresInDays(Number(event.target.value))
                        }
                      >
                        <option value={30}>30 dias</option>
                        <option value={90}>90 dias</option>
                        <option value={180}>180 dias</option>
                      </select>
                    </div>
                  </fieldset>
                  <fieldset className="form-section">
                    <legend className="form-section-title">Permissões</legend>
                    {availableScopes.map((scope) => (
                      <Checkbox
                        key={scope}
                        id={`cred-scope-${scope}`}
                        label={applicationPermissionLabel(scope)}
                        description={applicationPermissionDescription(
                          scope,
                          permissionDescriptions[scope],
                        )}
                        checked={selectedScopes.includes(scope)}
                        onChange={(checked) => {
                          setSelectedScopes((current) =>
                            checked
                              ? [...current, scope]
                              : current.filter((item) => item !== scope),
                          );
                          setFormError("");
                        }}
                      />
                    ))}
                  </fieldset>
                </form>
                <div className="detail-panel-footer">
                  <button
                    className="btn btn-primary btn-md"
                    type="submit"
                    form="cred-issue-form"
                    disabled={
                      busy || !name.trim() || selectedScopes.length === 0
                    }
                  >
                    {busy ? "Emitindo…" : "Emitir credencial"}
                  </button>
                  <button
                    className="btn btn-ghost btn-md"
                    type="button"
                    disabled={busy}
                    onClick={closeIssue}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </aside>
        </>,
        document.body,
      )}
      <ConfirmDialog
        open={confirmRevoke !== null}
        tone="danger"
        title="Revogar esta credencial?"
        description="Revogar invalida imediatamente os tokens desta credencial. Confirme que a nova já foi testada."
        details={
          revokeTarget
            ? [
                {
                  label: "Credencial",
                  value: revokeTarget.name || "Credencial sem nome",
                },
                { label: "Identificador", value: revokeTarget.client_id },
              ]
            : []
        }
        confirmLabel="Revogar credencial"
        busy={busy}
        onConfirm={() => confirmRevoke && void revoke(confirmRevoke)}
        onCancel={() => setConfirmRevoke(null)}
      />
      <ConfirmDialog
        open={confirmRecovery}
        title="Encerrar a verificação?"
        description="Confirme que você revisou toda a lista e a credencial desta tentativa não foi registrada."
        confirmLabel="Confirmar que não foi registrada"
        onConfirm={() => {
          setUncertain(null);
          setReconciled(false);
          setConfirmRecovery(false);
        }}
        onCancel={() => setConfirmRecovery(false)}
      />
      {issued && (
        <SecretReveal
          title="Credencial emitida"
          description="Guarde o segredo em um cofre seguro e teste a nova credencial antes de revogar a anterior."
          secretLabel="Segredo (client secret)"
          secret={issued.client_secret}
          details={[{ label: "Identificador", value: issued.client_id }]}
          onDismiss={() => setIssued(null)}
        />
      )}
    </section>
  );
}
