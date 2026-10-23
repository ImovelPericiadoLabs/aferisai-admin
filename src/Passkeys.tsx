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

export function Passkeys({ csrf }: { csrf: string }) {
  const [items, setItems] = useState<PasskeyItem[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const supported = browserSupportsWebAuthn();

  useEffect(() => {
    let active = true;
    listPasskeys()
      .then((result) => {
        if (active) setItems(result.items);
      })
      .catch(() => {
        if (active)
          setError("Não foi possível consultar suas chaves de acesso.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function register() {
    if (!label.trim()) {
      setError("Dê um nome para identificar esta chave.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
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
      setSuccess(
        "Chave de acesso cadastrada. Na próxima entrada, use a opção com chave.",
      );
    } catch {
      setError(
        "A chave não foi cadastrada. Confira o aviso do dispositivo e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (
      !window.confirm(
        "Revogar esta chave de acesso? Ela deixará de funcionar imediatamente.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await revokePasskey(id, csrf);
      setItems((current) => current.filter((item) => item.id !== id));
      setSuccess("Chave revogada.");
    } catch {
      setError("Não foi possível revogar a chave. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card passkeys-panel" aria-labelledby="passkeys-title">
      <h2 id="passkeys-title">Minhas chaves de acesso</h2>
      <p className="muted">
        Cadastre uma passkey deste dispositivo ou gerenciador de senhas. Depois,
        entre com a confirmação do dispositivo sem digitar senha e código TOTP.
      </p>
      {!supported && (
        <p className="error" role="alert">
          Este navegador não oferece chaves de acesso. Use senha e código do
          autenticador.
        </p>
      )}
      <div className="passkeys-register">
        <label htmlFor="passkey-label">Nome da chave</label>
        <input
          id="passkey-label"
          value={label}
          maxLength={80}
          placeholder="Ex.: notebook de trabalho"
          onChange={(event) => setLabel(event.target.value)}
          disabled={busy || !supported}
        />
        <button
          className="button primary"
          type="button"
          disabled={busy || !supported}
          onClick={() => void register()}
        >
          {busy ? "Aguarde…" : "Criar chave de acesso"}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      <h3>Chaves cadastradas</h3>
      {items.length === 0 ? (
        <p className="muted">Nenhuma chave cadastrada nesta conta.</p>
      ) : (
        <ul className="passkeys-list">
          {items.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.label}</strong>
                <small>
                  Criada em{" "}
                  {new Date(item.created_at).toLocaleDateString("pt-BR")}
                </small>
              </span>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => void revoke(item.id)}
              >
                Revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
