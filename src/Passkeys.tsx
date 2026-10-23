import { useEffect, useState } from "react";
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  listPasskeys,
  revokePasskey,
  type PasskeyItem,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldAction } from "./FieldAction";
import {
  lastUsedLabel,
  passkeyErrorKind,
  passkeyUsage,
  revokeWarning,
} from "./passkey-model";
import "./passkeys.css";

const createdFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function Passkeys({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "info" | "success" | "danger";
    text: string;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PasskeyItem | null>(null);
  const supported = browserSupportsWebAuthn();
  const usage = passkeyUsage(items.length);

  useEffect(() => {
    let active = true;
    listPasskeys()
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setLoadError(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (passkeyErrorKind(cause) === "unauthorized") onUnauthorized();
        else setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, onUnauthorized]);

  async function register() {
    setBusy(true);
    setNotice(null);
    try {
      const options = await beginPasskeyRegistration(csrf);
      const credential = await startRegistration({
        optionsJSON:
          options.public_key as unknown as PublicKeyCredentialCreationOptionsJSON,
      });
      const created = await finishPasskeyRegistration(
        options.challenge_id,
        credential as unknown as Record<string, unknown>,
        label.trim(),
        csrf,
      );
      setItems((current) => [created, ...current]);
      setLabel("");
      setNotice({
        tone: "success",
        text: "Chave de acesso cadastrada. Na próxima entrada, use a opção com chave.",
      });
    } catch (cause) {
      const kind = passkeyErrorKind(cause);
      if (kind === "unauthorized") onUnauthorized();
      else if (kind === "cancelled")
        setNotice({
          tone: "info",
          text: "Cadastro cancelado no dispositivo. Nenhuma chave foi criada.",
        });
      else
        setNotice({
          tone: "danger",
          text: "A chave não foi cadastrada. Confira o aviso do dispositivo e tente novamente.",
        });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(item: PasskeyItem) {
    setBusy(true);
    setNotice(null);
    try {
      await revokePasskey(item.id, csrf);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice({ tone: "success", text: "Chave revogada." });
    } catch (cause) {
      if (passkeyErrorKind(cause) === "unauthorized") onUnauthorized();
      else
        setNotice({
          tone: "danger",
          text: "Não foi possível revogar a chave. Tente novamente.",
        });
    } finally {
      setBusy(false);
      setRevokeTarget(null);
    }
  }

  return (
    <section className="page passkeys" aria-labelledby="passkeys-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="passkeys-title">
            Minhas chaves de acesso
          </h1>
          <p className="page-subtitle">
            Cadastre uma chave deste dispositivo ou do seu gerenciador de
            senhas. Depois, entre confirmando no dispositivo, sem digitar senha
            e código do autenticador.
          </p>
        </div>
        {!loading && !loadError && (
          <span className="badge badge-neutral">{usage.label}</span>
        )}
      </header>

      {!supported && (
        <div className="alert alert-danger passkeys-alert" role="alert">
          Este navegador não oferece chaves de acesso. Use senha e código do
          autenticador.
        </div>
      )}
      {notice && (
        <div
          className={`alert passkeys-alert${notice.tone === "success" ? " alert-success" : notice.tone === "danger" ? " alert-danger" : ""}`}
          role={notice.tone === "danger" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}

      <form
        className="card card-body"
        onSubmit={(event) => {
          event.preventDefault();
          if (label.trim() && !busy && !usage.full && supported)
            void register();
        }}
      >
        <FieldAction
          id="passkey-label"
          label="Nome da nova chave"
          hint={
            usage.full
              ? "Você atingiu o limite de 5 chaves. Revogue uma para cadastrar outra."
              : "Use um nome que identifique o dispositivo."
          }
          action={
            <button
              className="btn btn-primary btn-md"
              type="submit"
              disabled={busy || !supported || usage.full || !label.trim()}
            >
              {busy ? "Aguarde…" : "Criar chave de acesso"}
            </button>
          }
        >
          <input
            id="passkey-label"
            className="input"
            value={label}
            maxLength={80}
            required
            placeholder="Ex.: notebook de trabalho"
            disabled={busy || !supported || usage.full}
            onChange={(event) => setLabel(event.target.value)}
          />
        </FieldAction>
      </form>

      {loading ? (
        <div
          className="passkeys-skeleton"
          role="status"
          aria-label="Carregando"
        >
          {[0, 1].map((index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : loadError ? (
        <div className="error-state" role="alert">
          <strong>Não foi possível consultar suas chaves</strong>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhuma chave cadastrada</strong>
          <span>Crie uma chave para entrar sem digitar senha e código.</span>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table
            className="data-table keys-table"
            aria-label="Chaves cadastradas"
          >
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Criada em</th>
                <th scope="col">Último uso</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Nome">
                    <strong>{item.label}</strong>
                  </td>
                  <td data-label="Criada em">
                    {createdFormat.format(new Date(item.created_at))}
                  </td>
                  <td data-label="Último uso">
                    {lastUsedLabel(item.last_used_at)}
                  </td>
                  <td className="passkeys-actions">
                    <button
                      className="btn btn-ghost btn-sm btn-ghost-danger"
                      type="button"
                      disabled={busy}
                      onClick={() => setRevokeTarget(item)}
                    >
                      Revogar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        tone="danger"
        title="Revogar esta chave de acesso?"
        description={revokeWarning(items.length)}
        details={[
          { label: "Chave", value: revokeTarget?.label ?? "" },
          {
            label: "Último uso",
            value: lastUsedLabel(revokeTarget?.last_used_at ?? null),
          },
        ]}
        confirmLabel="Revogar chave"
        busy={busy}
        onConfirm={() => revokeTarget && void revoke(revokeTarget)}
        onCancel={() => setRevokeTarget(null)}
      />
    </section>
  );
}
