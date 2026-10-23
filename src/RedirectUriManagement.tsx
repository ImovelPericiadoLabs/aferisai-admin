import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getApplicationRedirectUris,
  replaceApplicationRedirectUris,
  type RedirectUriRegistry,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldAction } from "./FieldAction";
import { IntegrationIcon } from "./IntegrationIcon";
import {
  MAX_REDIRECT_URIS,
  validateRedirectUris,
} from "./integration-insights-model";

type Props = {
  applicationId: string;
  csrfToken: string;
  canEdit: boolean;
  onUnauthorized: () => void;
};

export function RedirectUriManagement({
  applicationId,
  csrfToken,
  canEdit,
  onUnauthorized,
}: Props) {
  const [registry, setRegistry] = useState<RedirectUriRegistry | null>(null);
  const [list, setList] = useState<string[]>([]);
  const [candidate, setCandidate] = useState("");
  const [candidateError, setCandidateError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let live = true;
    void getApplicationRedirectUris(applicationId)
      .then((result) => {
        if (!live) return;
        setRegistry(result);
        setList(result.redirect_uris);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setError("Não foi possível consultar as URLs de retorno.");
      });
    return () => {
      live = false;
    };
  }, [applicationId, onUnauthorized]);

  async function refresh(): Promise<RedirectUriRegistry | null> {
    setBusy(true);
    setError("");
    try {
      const result = await getApplicationRedirectUris(applicationId);
      setRegistry(result);
      setList(result.redirect_uris);
      setConfirm(false);
      return result;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError("Não foi possível atualizar as URLs de retorno.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!registry) return;
    const uris = list;
    setBusy(true);
    setError("");
    setNotice("");
    setConfirm(false);
    try {
      const result = await replaceApplicationRedirectUris(
        applicationId,
        uris,
        registry.version,
        csrfToken,
      );
      setRegistry(result);
      setList(result.redirect_uris);
      setNotice(
        uris.length === 0
          ? "URLs de retorno removidas."
          : "URLs de retorno registradas.",
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (cause instanceof ApiError && cause.status === 422)
        setError(cause.detail);
      else {
        const observed = await refresh();
        if (
          observed &&
          JSON.stringify(observed.redirect_uris) ===
            JSON.stringify([...uris].sort())
        )
          setNotice("Alteração confirmada após consultar o estado.");
        else if (observed)
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Resultado incerto. Confira o estado atualizado antes de tentar novamente.",
          );
      }
    } finally {
      setBusy(false);
    }
  }

  const saved = registry?.redirect_uris ?? [];
  const dirty = JSON.stringify(list) !== JSON.stringify(saved);
  const check = validateRedirectUris(list);

  function addCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = candidate.trim();
    if (!value) return;
    const trial = validateRedirectUris([...list, value]);
    if (trial.tooMany) {
      setCandidateError("O limite é de 5 destinos.");
      return;
    }
    const problem = trial.problems[list.length];
    if (problem) {
      setCandidateError(problem);
      return;
    }
    setList([...list, value]);
    setCandidate("");
    setCandidateError("");
    setNotice("");
  }

  function parts(value: string): { host: string; rest: string } {
    try {
      const url = new URL(value);
      return { host: url.host, rest: `${url.pathname}${url.search}` };
    } catch {
      return { host: value, rest: "" };
    }
  }

  return (
    <section className="cred" aria-label="URLs de retorno OAuth">
      <p className="form-hint">
        Cadastre até cinco destinos HTTPS exatos para a futura autorização
        delegada. O cadastro não libera acesso ao titular.
      </p>
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
      {registry && (
        <div className="oauth card">
          <div
            className="oauth-slots"
            role="img"
            aria-label={`${list.length} de ${MAX_REDIRECT_URIS} destinos`}
          >
            {Array.from({ length: MAX_REDIRECT_URIS }, (_, index) => (
              <span key={index} data-filled={index < list.length} />
            ))}
            <strong>
              {list.length} de {MAX_REDIRECT_URIS}
            </strong>
          </div>
          {list.length === 0 ? (
            <div className="empty-state" role="status">
              <strong>Nenhum destino cadastrado</strong>
              <span>
                Adicione o endereço exato para onde o retorno deve voltar.
              </span>
            </div>
          ) : (
            <ul className="oauth-list" aria-label="Destinos de retorno">
              {list.map((value, index) => {
                const { host, rest } = parts(value);
                return (
                  <li key={value} data-invalid={Boolean(check.problems[index])}>
                    <span className="oauth-lock">
                      <IntegrationIcon name="lock" size={16} />
                    </span>
                    <span className="oauth-url">
                      <strong>{host}</strong>
                      <small>{rest || "/"}</small>
                      {check.problems[index] && (
                        <em role="alert">{check.problems[index]}</em>
                      )}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Remover ${value}`}
                        disabled={busy}
                        onClick={() =>
                          setList(
                            list.filter((_, position) => position !== index),
                          )
                        }
                      >
                        <IntegrationIcon name="close" size={14} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && list.length < MAX_REDIRECT_URIS && (
            <form className="oauth-add" onSubmit={addCandidate} noValidate>
              <FieldAction
                id={`redirect-candidate-${applicationId}`}
                label="Novo destino"
                hint={
                  candidateError ? (
                    <span role="alert">{candidateError}</span>
                  ) : undefined
                }
                action={
                  <button
                    type="submit"
                    className="btn btn-secondary btn-md"
                    disabled={busy || !candidate.trim()}
                  >
                    Adicionar
                  </button>
                }
              >
                <input
                  id={`redirect-candidate-${applicationId}`}
                  className="input"
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                  placeholder="https://parceiro.exemplo.com/oauth/callback"
                  value={candidate}
                  aria-invalid={Boolean(candidateError)}
                  disabled={busy}
                  onChange={(event) => {
                    setCandidate(event.target.value);
                    setCandidateError("");
                  }}
                />
              </FieldAction>
            </form>
          )}
        </div>
      )}
      {registry && (dirty || canEdit) && (
        <div className="oauth-bar" data-dirty={dirty}>
          <span>
            {dirty
              ? "Alterações não salvas. A lista inteira será substituída."
              : "Lista sincronizada com o servidor."}
          </span>
          <div className="appdir-actions">
            <button
              type="button"
              className="btn btn-ghost btn-md"
              disabled={busy}
              onClick={() => (dirty ? setList(saved) : void refresh())}
            >
              {dirty ? "Descartar" : "Atualizar estado"}
            </button>
            {canEdit && (
              <button
                type="button"
                className="btn btn-primary btn-md"
                disabled={busy || !dirty || !check.ok}
                onClick={() => setConfirm(true)}
              >
                Revisar e salvar
              </button>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title="Substituir as URLs de retorno?"
        description="A lista inteira será substituída pelos destinos abaixo."
        details={
          list.length
            ? list.map((value, index) => ({
                label: `URL ${index + 1}`,
                value,
              }))
            : [
                {
                  label: "Resultado",
                  value: "Todos os destinos serão removidos",
                },
              ]
        }
        confirmLabel="Confirmar URLs"
        busy={busy}
        onConfirm={() => void save()}
        onCancel={() => setConfirm(false)}
      />
    </section>
  );
}
