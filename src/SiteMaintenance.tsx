import { useEffect, useState, type FormEvent } from "react";
import { ApiError, getSiteMaintenancePolicy, updateSiteMaintenancePolicy, type SiteMaintenancePolicy } from "./api";
import "./site-maintenance.css";

function localValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function SiteMaintenance({ csrf, onUnauthorized, onToast }: {
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind?: "success" | "error" | "warning" | "info") => void;
}) {
  const [policy, setPolicy] = useState<SiteMaintenancePolicy | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function apply(current: SiteMaintenancePolicy) {
    setPolicy(current);
    setEnabled(current.enabled);
    setStartsAt(localValue(current.starts_at));
    setEndsAt(localValue(current.ends_at));
    setPublicMessage(current.public_message ?? "");
    setNote(current.internal_note ?? "");
    setReason("");
  }

  useEffect(() => {
    let live = true;
    getSiteMaintenancePolicy()
      .then((current) => { if (live) apply(current); })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        setError(cause instanceof ApiError ? cause.detail : "Não foi possível consultar a manutenção.");
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [onUnauthorized]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateSiteMaintenancePolicy({
        expected_version: policy.version, enabled,
        starts_at: isoValue(startsAt), ends_at: isoValue(endsAt),
        public_message: publicMessage.trim() || null,
        internal_note: note.trim() || null, reason: reason.trim(),
      }, csrf);
      apply(updated);
      onToast("Manutenção atualizada.", "success");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      if (cause instanceof ApiError && cause.status === 409) {
        const current = await getSiteMaintenancePolicy().catch(() => null);
        if (current) apply(current);
      }
      setError(cause instanceof ApiError ? cause.detail : "Não foi possível salvar a manutenção.");
    } finally { setBusy(false); }
  }

  const active = Boolean(policy?.enabled && (!policy.starts_at || new Date(policy.starts_at).getTime() <= now) &&
    (!policy.ends_at || now < new Date(policy.ends_at).getTime()));
  const scheduled = Boolean(policy?.enabled && policy.starts_at && new Date(policy.starts_at).getTime() > now);

  return <section className="page site-maintenance" aria-labelledby="site-maintenance-title">
    <div className="site-maintenance-heading">
      <div><p className="eyebrow">Operação do site</p><h1 id="site-maintenance-title" className="page-title">Manutenção</h1>
        <p className="muted">Controle a disponibilidade do site e da API pública. O painel e a conciliação de pagamentos seguem acessíveis.</p></div>
      {policy && <span className={`site-maintenance-status ${active ? "is-active" : ""}`} role="status">
        <span aria-hidden="true" />{active ? "Em manutenção" : scheduled ? "Agendada" : "Site disponível"}
      </span>}
    </div>
    {loading ? <div className="card" role="status">Carregando configuração…</div> : error && !policy ? <div className="alert alert-danger" role="alert">{error}</div> : policy &&
      <form className="site-maintenance-card" onSubmit={(event) => void save(event)}>
        <div className="site-maintenance-switch-row"><div><h2>Suspender acesso público</h2>
          <p>Visitantes verão a página de manutenção e os endpoints públicos responderão indisponíveis.</p></div>
          <label className="site-maintenance-switch"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span>{enabled ? "Ativado" : "Desativado"}</span></label></div>
        <div className="site-maintenance-grid"><label>Início <small>Opcional · vazio aplica agora</small>
          <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
          <label>Término <small>Opcional · vazio permanece até desligar</small>
          <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label></div>
        <label className="site-maintenance-field">Mensagem para visitantes <small>Opcional · aparece na página de manutenção</small>
          <textarea rows={2} maxLength={240} value={publicMessage} onChange={(event) => setPublicMessage(event.target.value)} placeholder="Estamos atualizando o serviço. Volte em breve." /></label>
        <label className="site-maintenance-field">Nota interna <small>Opcional · visível somente à equipe</small>
          <textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <label className="site-maintenance-field">Motivo da alteração <small>Obrigatório para a trilha de auditoria</small>
          <textarea rows={2} minLength={5} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <div className="site-maintenance-actions"><span>Versão {policy.version} · cada alteração fica registrada.</span>
          <button type="submit" className="button primary" disabled={busy || reason.trim().length < 5}>{busy ? "Salvando…" : "Salvar configuração"}</button></div>
      </form>}
  </section>;
}
