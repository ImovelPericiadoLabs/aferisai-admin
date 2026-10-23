import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getOnrEndpoint,
  resetOnrEndpoint,
  setOnrEndpoint,
  type OnrEndpoint,
} from "./api";
import type { ToastKind } from "./useToast";
import "./onr-endpoint-settings.css";

const OFFICIAL = "https://ridigital.org.br";
const WORKER = "https://onr-ridigital-proxy.sec-devchamps.workers.dev";

function message(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 409)
      return "A origem mudou. Confira a configuração atual antes de salvar novamente.";
    if (cause.status === 422)
      return `${cause.detail} O Worker deve negar acesso sem a chave em todas as rotas.`;
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}

export function OnrEndpointSettings({
  csrf,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [endpoint, setEndpoint] = useState<OnrEndpoint | null>(null);
  const [origin, setOrigin] = useState("");
  const [key, setKey] = useState("");
  const [reason, setReason] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await getOnrEndpoint();
      setEndpoint(current);
      setOrigin(current.mode === "proxy" ? current.origin : "");
      setError("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!endpoint || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await setOnrEndpoint(
        origin.trim(),
        key,
        endpoint.version,
        reason.trim(),
        csrf,
      );
      setEndpoint(updated);
      setOrigin(updated.origin);
      setReason("");
      setEditing(false);
      onToast("Proxy RI Digital configurado para novas execuções.", "success");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(message(cause));
      if (cause instanceof ApiError && cause.status === 409) await load();
    } finally {
      setKey("");
      setBusy(false);
    }
  }

  async function restore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!endpoint || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await resetOnrEndpoint(
        endpoint.version,
        resetReason.trim(),
        csrf,
      );
      setEndpoint(updated);
      setOrigin("");
      setKey("");
      setResetReason("");
      setEditing(false);
      onToast("Origem oficial RI Digital restaurada.", "success");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(message(cause));
      if (cause instanceof ApiError && cause.status === 409) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="onr-endpoint" aria-labelledby="onr-endpoint-title">
      <div className="onr-endpoint-heading">
        <div>
          <h2 id="onr-endpoint-title">Conexão RI Digital</h2>
          <p>Escolha a origem usada nas próximas consultas e pedidos.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => void load()}
          disabled={loading || busy}
        >
          Atualizar
        </button>
      </div>

      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {loading && !endpoint ? (
        <p role="status">Carregando origem RI Digital…</p>
      ) : endpoint ? (
        <>
          <dl className="onr-endpoint-summary">
            <div>
              <dt>Origem em uso</dt>
              <dd>
                {endpoint.mode === "official"
                  ? "Portal original"
                  : "Proxy protegido"}
              </dd>
            </div>
            <div>
              <dt>Endereço</dt>
              <dd>
                <code>{endpoint.origin}</code>
              </dd>
            </div>
            <div>
              <dt>Chave do proxy</dt>
              <dd>
                {endpoint.proxy_key_configured
                  ? "Configurada"
                  : "Não se aplica"}
              </dd>
            </div>
            <div>
              <dt>Versão</dt>
              <dd>{endpoint.version}</dd>
            </div>
          </dl>
          <p className="onr-endpoint-note">
            A troca vale para execuções iniciadas depois de salvar. Uma compra
            com resultado incerto continua exigindo conciliação; não ocorre
            reenvio automático para outra origem.
          </p>

          {!editing ? (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => setEditing(true)}
            >
              {endpoint.mode === "proxy" ? "Trocar proxy" : "Configurar proxy"}
            </button>
          ) : (
            <form
              className="onr-endpoint-form"
              onSubmit={(event) => void save(event)}
            >
              <label htmlFor="onr-proxy-origin">URL raiz do Worker</label>
              <input
                id="onr-proxy-origin"
                className="input"
                type="url"
                value={origin}
                placeholder={WORKER}
                maxLength={255}
                required
                disabled={busy}
                onChange={(event) => setOrigin(event.target.value)}
              />
              <small>
                Somente HTTPS na conta sec-devchamps.workers.dev, sem caminho ou
                parâmetro.
              </small>
              <label htmlFor="onr-proxy-key">Chave do Worker</label>
              <input
                id="onr-proxy-key"
                className="input"
                type="password"
                value={key}
                minLength={24}
                maxLength={256}
                autoComplete="off"
                required
                disabled={busy}
                onChange={(event) => setKey(event.target.value)}
              />
              <small>
                O Worker deve retornar 401 ou 403 sem a chave. Ela não aparecerá
                novamente.
              </small>
              <label htmlFor="onr-proxy-reason">Motivo da troca</label>
              <textarea
                id="onr-proxy-reason"
                className="input"
                value={reason}
                minLength={10}
                maxLength={500}
                required
                disabled={busy}
                onChange={(event) => setReason(event.target.value)}
              />
              <div className="onr-endpoint-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={busy}
                >
                  {busy ? "Verificando…" : "Verificar e salvar"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-md"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false);
                    setKey("");
                    setReason("");
                    setError("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {endpoint.mode === "proxy" && (
            <form
              className="onr-endpoint-reset"
              onSubmit={(event) => void restore(event)}
            >
              <h3>Voltar ao portal original</h3>
              <p>
                A origem passará a ser <code>{OFFICIAL}</code>. A chave do proxy
                será removida do cofre.
              </p>
              <label htmlFor="onr-reset-reason">Motivo da restauração</label>
              <textarea
                id="onr-reset-reason"
                className="input"
                value={resetReason}
                minLength={10}
                maxLength={500}
                required
                disabled={busy}
                onChange={(event) => setResetReason(event.target.value)}
              />
              <button
                type="submit"
                className="btn btn-secondary btn-md"
                disabled={busy}
              >
                Restaurar origem oficial
              </button>
            </form>
          )}
        </>
      ) : null}
    </section>
  );
}
