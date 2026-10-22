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

type Props = {
  applicationId: string;
  csrfToken: string;
  canIssue: boolean;
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

export function CredentialManagement({
  applicationId,
  csrfToken,
  canIssue,
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

  useEffect(() => {
    let live = true;
    listPartnerCredentials(applicationId)
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
  }, [applicationId, onUnauthorized]);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const result = await listPartnerCredentials(applicationId);
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
      const result = await listPartnerCredentials(applicationId, cursor);
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
      );
      setIssued(result);
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
      await revokePartnerCredential(applicationId, credentialId, csrfToken);
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
  const activeCount = items.filter((item) => item.status === "active").length;

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
          <strong>Novo segredo: exibição única</strong>
          <p>
            Guarde em um cofre seguro e teste a nova credencial antes de revogar
            a anterior.
          </p>
          <dl>
            <div>
              <dt>Client ID</dt>
              <dd>{issued.client_id}</dd>
            </div>
            <div>
              <dt>Client secret</dt>
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
                  <strong>{credential.client_id}</strong>
                  <small>Criada em {dateLabel(credential.created_at)}</small>
                  {credential.issue_request_id && (
                    <small>Emissão: {credential.issue_request_id}</small>
                  )}
                  {credential.revoked_at && (
                    <small>
                      Revogada em {dateLabel(credential.revoked_at)}
                    </small>
                  )}
                </div>
                <span className="pill">
                  {credential.status === "active" ? "Ativa" : "Revogada"}
                </span>
              </div>
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
          <div className="credential-confirm">
            <p>
              O novo segredo aparecerá uma vez. Prepare um cofre seguro antes de
              continuar.
            </p>
            <div className="button-row">
              <button
                className="button primary"
                type="button"
                disabled={busy}
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
            onClick={() => setConfirmIssue(true)}
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
