import { useEffect, useState } from "react";
import { browserSupportsWebAuthn, startRegistration, type PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { beginPartnerPasskeyRegistration, finishPartnerPasskeyRegistration, listPartnerPasskeys, revokePartnerPasskey, type PartnerPasskeyItem } from "./api";

export function PartnerPasskeys({ csrf, onUnauthorized }: { csrf: string; onUnauthorized: () => void }) {
  const [items, setItems] = useState<PartnerPasskeyItem[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const supported = browserSupportsWebAuthn();

  useEffect(() => {
    listPartnerPasskeys().then((result) => setItems(result.items)).catch((cause: unknown) => {
      if (cause instanceof Error && "status" in cause && (cause as { status?: number }).status === 401) onUnauthorized();
      else setError("Não foi possível carregar suas chaves.");
    });
  }, [onUnauthorized]);

  async function register() {
    setBusy(true); setError("");
    try {
      const options = await beginPartnerPasskeyRegistration(csrf);
      const credential = await startRegistration({ optionsJSON: options.public_key as unknown as PublicKeyCredentialCreationOptionsJSON });
      const created = await finishPartnerPasskeyRegistration(options.challenge_id, credential as unknown as Record<string, unknown>, label.trim(), csrf);
      setItems((current) => [created, ...current]); setLabel("");
    } catch (cause) {
      if (cause instanceof Error && "status" in cause && (cause as { status?: number }).status === 401) onUnauthorized();
      else setError("A chave não foi cadastrada. Confira o aviso do dispositivo e tente novamente.");
    } finally { setBusy(false); }
  }

  async function revoke(item: PartnerPasskeyItem) {
    if (!window.confirm(`Revogar a chave “${item.label}”?`)) return;
    setBusy(true); setError("");
    try { await revokePartnerPasskey(item.id, csrf); setItems((current) => current.filter((entry) => entry.id !== item.id)); }
    catch (cause) {
      if (cause instanceof Error && "status" in cause && (cause as { status?: number }).status === 401) onUnauthorized();
      else setError("Não foi possível revogar a chave.");
    } finally { setBusy(false); }
  }

  return <section className="page passkeys" aria-labelledby="partner-passkeys-title">
    <header className="page-header"><div><h1 className="page-title" id="partner-passkeys-title">Segurança do acesso</h1><p className="page-subtitle">Use uma passkey do seu dispositivo ou gerenciador de senhas para entrar sem digitar a senha e o código.</p></div><span className="badge badge-neutral">{items.length}/5 chaves</span></header>
    {!supported && <div className="alert alert-danger" role="alert">Este navegador não oferece passkeys. Use outro dispositivo ou senha e autenticador.</div>}
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    <form className="card card-body" onSubmit={(event) => { event.preventDefault(); if (label.trim()) void register(); }}>
      <div className="form-field"><label className="form-field-label" htmlFor="partner-passkey-label">Nome da chave</label><input id="partner-passkey-label" className="input" maxLength={80} placeholder="Ex.: notebook de trabalho" value={label} onChange={(event) => setLabel(event.target.value)} disabled={busy || !supported || items.length >= 5} /></div>
      <button className="btn btn-primary btn-md" disabled={busy || !supported || !label.trim() || items.length >= 5}>{busy ? "Aguarde…" : "Criar passkey"}</button>
    </form>
    <div className="card card-body"><h2 className="section-title">Chaves cadastradas</h2>{items.length === 0 ? <p className="form-hint">Nenhuma passkey cadastrada.</p> : items.map((item) => <div className="field-action" key={item.id}><div><strong>{item.label}</strong><span className="form-hint">Criada em {new Date(item.created_at).toLocaleDateString("pt-BR")}</span></div><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void revoke(item)}>Revogar</button></div>)}</div>
  </section>;
}
