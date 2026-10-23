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
import {
  applicationPermissionDescription,
  applicationPermissionGlyph,
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
    setConfirmIssue(false);
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

  const orphan = items.find((item) => item.issue_request_id === uncertain);
  const activeCount = items.filter(
    (item) => item.status === "active" && !isExpired(item.expires_at),
  ).length;

  return (
    <section className="credential-panel" aria-label="Credenciais da aplicação">
      <div className="detail-card-head">
        <h5>Credenciais</h5>
        <button
          className="back-link"
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Atualizar
        </button>
      </div>
      <p>
        Troque o segredo antes de revogar o anterior. Até duas credenciais podem
        estar ativas durante a troca.
      </p>
      {!loaded && <p role="status">Carregando credenciais…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="profile-saved" role="status">
          {notice}
        </p>
      )}
      {uncertain && (
        <div className="credential-recovery" role="status">
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
          {reconciled &&
            !orphan &&
            !cursor &&
            (confirmRecovery ? (
              <div className="button-row">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setUncertain(null);
                    setReconciled(false);
                    setConfirmRecovery(false);
                  }}
                >
                  Confirmar que não foi registrada
                </button>
                <button
                  className="back-link"
                  type="button"
                  onClick={() => setConfirmRecovery(false)}
                >
                  Voltar
                </button>
              </div>
            ) : (
              <button
                className="back-link"
                type="button"
                onClick={() => setConfirmRecovery(true)}
              >
                Revisei toda a lista; encerrar verificação
              </button>
            ))}
        </div>
      )}
      {issued && (
        <div className="credential-issued" role="status">
          <strong>Credencial emitida · segredo exibido uma vez</strong>
          <p>
            Guarde em um cofre seguro e teste a nova credencial antes de revogar
            a anterior.
          </p>
          <dl>
            <div>
              <dt>Identificador</dt>
              <dd>{issued.client_id}</dd>
            </div>
            <div>
              <dt>Segredo</dt>
              <dd className="secret">{issued.client_secret}</dd>
            </div>
          </dl>
          <button
            className="button secondary"
            type="button"
            onClick={() => setIssued(null)}
          >
            Entendi, ocultar segredo
          </button>
        </div>
      )}
      {loaded && items.length === 0 && !error && (
        <p className="detail-empty">Nenhuma credencial registrada.</p>
      )}
      {items.length > 0 && (
        <ul className="credential-list">
          {items.map((credential) => (
            <li key={credential.id}>
              <div className="credential-row">
                <div>
                  <strong>{credential.name || "Credencial sem nome"}</strong>
                  <small>
                    Emitida em {dateLabel(credential.created_at)} ·{" "}
                    {credential.expires_at
                      ? `Vence em ${dateLabel(credential.expires_at)}`
                      : "Sem prazo definido"}
                  </small>
                  {!!credential.scopes?.length && (
                    <small>
                      {credential.scopes
                        .map(applicationPermissionLabel)
                        .join(" · ")}
                    </small>
                  )}
                  {credential.revoked_at && (
                    <small>
                      Revogada em {dateLabel(credential.revoked_at)}
                    </small>
                  )}
                </div>
                <span className="pill">
                  {credential.status === "revoked"
                    ? "Revogada"
                    : isExpired(credential.expires_at)
                      ? "Expirada"
                      : "Ativa"}
                </span>
              </div>
              <details className="credential-technical">
                <summary>Detalhes técnicos</summary>
                <dl>
                  <div>
                    <dt>Identificador público</dt>
                    <dd>{credential.client_id}</dd>
                  </div>
                  {credential.issue_request_id && (
                    <div>
                      <dt>Emissão</dt>
                      <dd>{credential.issue_request_id}</dd>
                    </div>
                  )}
                </dl>
              </details>
              {credential.status === "active" &&
                (confirmRevoke === credential.id ? (
                  <div className="credential-confirm">
                    <p>
                      Revogar agora invalida imediatamente os tokens desta
                      credencial. A nova já foi testada?
                    </p>
                    <div className="button-row">
                      <button
                        className="button secondary"
                        type="button"
                        disabled={busy}
                        onClick={() => void revoke(credential.id)}
                      >
                        Confirmar revogação
                      </button>
                      <button
                        className="back-link"
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmRevoke(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="back-link"
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmRevoke(credential.id)}
                  >
                    Revogar credencial
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
      {cursor && (
        <button
          className="back-link"
          type="button"
          disabled={busy}
          onClick={() => void loadMore()}
        >
          Carregar mais
        </button>
      )}
      {loaded &&
        !listError &&
        canIssue &&
        !uncertain &&
        !issued &&
        activeCount < 2 &&
        (confirmIssue ? (
          <div className="credential-issue-form">
            <h6>Emitir credencial</h6>
            <p>
              Identifique o sistema e escolha o prazo. O segredo completo
              aparecerá uma única vez.
            </p>
            <div className="field">
              <label htmlFor="credential-name">Nome da credencial</label>
              <input
                id="credential-name"
                value={name}
                maxLength={80}
                placeholder="Ex.: Sistema de produção"
                onChange={(event) => {
                  setName(event.target.value);
                  setFormError("");
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="credential-expiry">Validade</label>
              <select
                id="credential-expiry"
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
            <fieldset className="credential-scope-options">
              <legend>Permissões</legend>
              {availableScopes.map((scope, index) => (
                <label key={scope}>
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={(event) => {
                      setSelectedScopes((current) =>
                        event.target.checked
                          ? [...current, scope]
                          : current.filter((item) => item !== scope),
                      );
                      setFormError("");
                    }}
                  />
                  <span className="credential-scope-icon" aria-hidden="true">
                    {applicationPermissionGlyph(scope, index)}
                  </span>
                  <span>
                    <strong>{applicationPermissionLabel(scope)}</strong>
                    <small>
                      {applicationPermissionDescription(
                        scope,
                        permissionDescriptions[scope],
                      )}
                    </small>
                  </span>
                </label>
              ))}
            </fieldset>
            {formError && (
              <small className="webhook-field-error" role="alert">
                {formError}
              </small>
            )}
            <p>
              O novo segredo aparecerá uma vez. Prepare um cofre seguro antes de
              continuar.
            </p>
            <div className="button-row">
              <button
                className="button primary"
                type="button"
                disabled={busy || !name.trim() || selectedScopes.length === 0}
                onClick={() => void issue()}
              >
                Confirmar emissão
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setConfirmIssue(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            className="button primary"
            type="button"
            disabled={busy}
            onClick={() => {
              setSelectedScopes(
                availableScopes.includes("application:read")
                  ? ["application:read"]
                  : availableScopes.slice(0, 1),
              );
              setConfirmIssue(true);
            }}
          >
            Emitir nova credencial
          </button>
        ))}
      {loaded && activeCount >= 2 && (
        <p>
          Limite de duas credenciais ativas. Revogue uma antiga antes de emitir
          outra.
        </p>
      )}
      {loaded && !canIssue && (
        <p>
          A organização e a aplicação precisam estar ativas para emitir uma
          credencial.
        </p>
      )}
    </section>
  );
}
