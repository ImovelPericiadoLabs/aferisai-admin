import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getApplicationRedirectUris,
  replaceApplicationRedirectUris,
  type RedirectUriRegistry,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";

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
  const [draft, setDraft] = useState("");
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
        setDraft(result.redirect_uris.join("\n"));
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
      setDraft(result.redirect_uris.join("\n"));
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

  function startConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setConfirm(true);
  }

  async function save() {
    if (!registry) return;
    const uris = draft
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
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
      setDraft(result.redirect_uris.join("\n"));
      setNotice(
        uris.length === 0
          ? "URLs de retorno removidas."
          : "URLs de retorno registradas.",
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
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

  const lines = draft
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <section className="cred" aria-label="URLs de retorno OAuth">
      <p className="form-hint">
        Cadastre até cinco destinos HTTPS exatos para a futura autorização
        delegada. O cadastro não libera acesso ao titular. Lista vazia remove
        todos os destinos.
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
        <form className="card cred-form" onSubmit={startConfirmation}>
          <div className="form-field">
            <label
              className="form-field-label"
              htmlFor={`redirect-uris-${applicationId}`}
            >
              Uma URL por linha
            </label>
            <textarea
              id={`redirect-uris-${applicationId}`}
              className="input"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setConfirm(false);
              }}
              rows={Math.max(3, draft.split("\n").length + 1)}
              spellCheck={false}
              placeholder="https://parceiro.exemplo.com/oauth/callback"
              disabled={!canEdit || busy}
            />
            <span className="form-hint">
              {lines.length} de 5 destinos informados.
            </span>
          </div>
          <div className="appdir-actions">
            <button
              type="button"
              className="btn btn-ghost btn-md"
              onClick={() => void refresh()}
              disabled={busy}
            >
              Atualizar estado
            </button>
            {canEdit && (
              <button
                type="submit"
                className="btn btn-primary btn-md"
                disabled={busy}
              >
                Revisar alteração
              </button>
            )}
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirm}
        title="Substituir as URLs de retorno?"
        description="A lista inteira será substituída pelos destinos abaixo."
        details={
          lines.length
            ? lines.map((value, index) => ({
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
