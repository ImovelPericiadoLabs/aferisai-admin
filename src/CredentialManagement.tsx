import { useEffect, useState } from "react";
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
import { SecretReveal } from "./SecretReveal";
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

  const revokeTarget = items.find((item) => item.id === confirmRevoke);

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
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Atualizar
        </button>
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
        <div className="empty-state" role="status">
          <strong>Nenhuma credencial registrada</strong>
          <span>Emita a primeira credencial para integrar seus sistemas.</span>
        </div>
      )}
      {items.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table" aria-label="Credenciais">
            <thead>
              <tr>
                <th scope="col">Credencial</th>
                <th scope="col">Permissões</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((credential) => {
                const state =
                  credential.status === "revoked"
                    ? { label: "Revogada", tone: "badge-neutral" }
                    : isExpired(credential.expires_at)
                      ? { label: "Expirada", tone: "badge-warning" }
                      : { label: "Ativa", tone: "badge-success" };
                return (
                  <tr key={credential.id}>
                    <td data-label="Credencial">
                      <strong className="rules-cell-main">
                        {credential.name || "Credencial sem nome"}
                      </strong>
                      <small className="rules-cell-sub">
                        <code>{credential.client_id}</code>
                      </small>
                      <small className="rules-cell-sub">
                        Emitida em {dateLabel(credential.created_at)} ·{" "}
                        {credential.expires_at
                          ? `Vence em ${dateLabel(credential.expires_at)}`
                          : "Sem prazo definido"}
                        {credential.revoked_at
                          ? ` · Revogada em ${dateLabel(credential.revoked_at)}`
                          : ""}
                      </small>
                    </td>
                    <td data-label="Permissões">
                      {credential.scopes?.length
                        ? credential.scopes
                            .map(applicationPermissionLabel)
                            .join(" · ")
                        : "—"}
                    </td>
                    <td data-label="Estado">
                      <span className={`badge ${state.tone}`}>
                        {state.label}
                      </span>
                    </td>
                    <td className="appws-open">
                      {credential.status === "active" && (
                        <button
                          className="btn btn-ghost-danger btn-sm"
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmRevoke(credential.id)}
                        >
                          Revogar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
      {loaded &&
        !listError &&
        canIssue &&
        !uncertain &&
        !issued &&
        activeCount < 2 &&
        (confirmIssue ? (
          <section className="card cred-form" aria-labelledby="cred-form-title">
            <h4 id="cred-form-title">Emitir credencial</h4>
            <p className="form-hint">
              Identifique o sistema e escolha o prazo. O segredo completo
              aparecerá uma única vez. Prepare um cofre seguro antes de
              continuar.
            </p>
            <div className="form-row">
              <div className="form-field">
                <label className="form-field-label" htmlFor="credential-name">
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
              </div>
              <div className="form-field">
                <label className="form-field-label" htmlFor="credential-expiry">
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
            </div>
            <fieldset className="cred-scopes">
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
            {formError && (
              <span className="form-hint onboarding-error" role="alert">
                {formError}
              </span>
            )}
            <div className="appdir-actions">
              <button
                className="btn btn-ghost btn-md"
                type="button"
                disabled={busy}
                onClick={() => setConfirmIssue(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary btn-md"
                type="button"
                disabled={busy || !name.trim() || selectedScopes.length === 0}
                onClick={() => void issue()}
              >
                Confirmar emissão
              </button>
            </div>
          </section>
        ) : (
          <button
            className="btn btn-primary btn-md cred-more"
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
