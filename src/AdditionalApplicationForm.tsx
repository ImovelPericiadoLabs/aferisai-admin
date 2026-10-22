import { useState, type FormEvent } from "react";
import { ApiError, createAdditionalApplication, getOrganization } from "./api";
import { uuidv7 } from "./uuidv7";

type Attempt = { id: string; name: string };

function savedAttempt(key: string): Attempt | null {
  try {
    const value = sessionStorage.getItem(key);
    if (!value) return null;
    const attempt: unknown = JSON.parse(value);
    if (typeof attempt !== "object" || attempt === null) return null;
    const record = attempt as Record<string, unknown>;
    return typeof record.id === "string" && typeof record.name === "string"
      ? { id: record.id, name: record.name }
      : null;
  } catch {
    return null;
  }
}

export function AdditionalApplicationForm({
  organizationId,
  csrfToken,
  onCreated,
  onUnauthorized,
}: {
  organizationId: string;
  csrfToken: string;
  onCreated: () => void;
  onUnauthorized: () => void;
}) {
  const storageKey = `aferis-additional-application:${organizationId}`;
  const [attempt, setAttempt] = useState<Attempt | null>(() =>
    savedAttempt(storageKey),
  );
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function finish() {
    sessionStorage.removeItem(storageKey);
    setAttempt(null);
    setName("");
    setNotice(
      "Aplicação disponível. Emita uma credencial na seção dela para conectar o parceiro.",
    );
    onCreated();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = attempt ?? { id: uuidv7(), name: name.trim() };
    if (!current.name) return;
    sessionStorage.setItem(storageKey, JSON.stringify(current));
    setAttempt(current);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await createAdditionalApplication(
        organizationId,
        current.id,
        current.name,
        csrfToken,
      );
      finish();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Resultado incerto. Consulte a organização e tente novamente com o mesmo ID.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function reconcile() {
    if (!attempt) return;
    setBusy(true);
    setError("");
    try {
      const detail = await getOrganization(organizationId);
      if (
        detail.applications.some(
          (item) => item.id === attempt.id && item.name === attempt.name,
        )
      )
        finish();
      else
        setNotice(
          "Aplicação ainda não aparece no cadastro. Tente novamente com o mesmo ID.",
        );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError("Não foi possível consultar a organização agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={(event) => void submit(event)}>
      <label htmlFor="additional-application-name">Nova aplicação</label>
      <input
        id="additional-application-name"
        value={attempt?.name ?? name}
        onChange={(event) => setName(event.target.value)}
        minLength={1}
        maxLength={255}
        disabled={busy || attempt !== null}
        required
      />
      {attempt && (
        <small>
          Identificador da tentativa: {attempt.id}. Uma nova tentativa usa este
          mesmo ID.
        </small>
      )}
      <div className="actions">
        <button
          className="button primary"
          type="submit"
          disabled={busy || (!attempt && !name.trim())}
        >
          {attempt ? "Tentar novamente" : "Criar aplicação"}
        </button>
        {attempt && (
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={() => void reconcile()}
          >
            Consultar cadastro
          </button>
        )}
      </div>
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
    </form>
  );
}
