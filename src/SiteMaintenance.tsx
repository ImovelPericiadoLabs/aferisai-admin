import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getSiteMaintenancePolicy,
  updateSiteMaintenancePolicy,
  type MaintenanceMode,
  type SiteMaintenancePolicy,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  describeWindow,
  draftChanges,
  isoValue,
  localValue,
  maintenanceState,
  presetEnd,
  windowProblem,
  type MaintenanceDraft,
  type MaintenanceState,
} from "./maintenance-model";
import "./site-maintenance.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const formatIso = (iso: string) => dateTime.format(new Date(iso));

const STATE_VIEW: Record<
  MaintenanceState,
  { label: string; tone: string; headline: string; detail: string }
> = {
  off: {
    label: "Site disponível",
    tone: "badge-success",
    headline: "O site está no ar",
    detail: "Visitantes e a API pública funcionam normalmente.",
  },
  scheduled: {
    label: "Agendada",
    tone: "badge-info",
    headline: "Restrição agendada",
    detail: "O site continua no ar até o horário de início.",
  },
  active: {
    label: "Ativa",
    tone: "badge-warning",
    headline: "Restrição de acesso ativa",
    detail:
      "O modo configurado está em vigor. Veja o painel de detalhes abaixo.",
  },
  ended: {
    label: "Encerrada",
    tone: "badge-neutral",
    headline: "A restrição já terminou",
    detail:
      "O término passou e o site voltou ao ar. A configuração continua ligada: mude o modo para Disponível ou agende outra janela.",
  },
};

const PRESETS: { label: string; minutes: number }[] = [
  { label: "1 hora", minutes: 60 },
  { label: "2 horas", minutes: 120 },
  { label: "4 horas", minutes: 240 },
  { label: "24 horas", minutes: 1440 },
];

const emptyDraft: MaintenanceDraft = {
  mode: "off",
  startsAt: "",
  endsAt: "",
  publicMessage: "",
  note: "",
};

const draftFrom = (policy: SiteMaintenancePolicy): MaintenanceDraft => ({
  mode: policy.mode,
  startsAt: localValue(policy.starts_at),
  endsAt: localValue(policy.ends_at),
  publicMessage: policy.public_message ?? "",
  note: policy.internal_note ?? "",
});

export function SiteMaintenance({
  csrf,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  onUnauthorized: () => void;
  onToast: (
    message: string,
    kind?: "success" | "error" | "warning" | "info",
  ) => void;
}) {
  const [policy, setPolicy] = useState<SiteMaintenancePolicy | null>(null);
  const [draft, setDraft] = useState<MaintenanceDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const apply = useCallback((current: SiteMaintenancePolicy) => {
    setPolicy(current);
    setDraft(draftFrom(current));
  }, []);

  useEffect(() => {
    let live = true;
    getSiteMaintenancePolicy(csrf)
      .then((current) => {
        if (live) apply(current);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível consultar a manutenção.",
        );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [apply, csrf, onUnauthorized]);

  const set = <K extends keyof MaintenanceDraft>(
    key: K,
    value: MaintenanceDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const changes = policy ? draftChanges(policy, draft) : [];
  const problem = windowProblem(draft.startsAt, draft.endsAt, now);
  const state = maintenanceState(policy, now);
  const view = STATE_VIEW[state];
  const draftState = maintenanceState(
    {
      mode: draft.mode,
      starts_at: isoValue(draft.startsAt),
      ends_at: isoValue(draft.endsAt),
    },
    now,
  );
  const takesSiteDown = draft.mode !== "off" && draftState !== "ended";

  async function save(reason: string) {
    if (!policy || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateSiteMaintenancePolicy(
        {
          expected_version: policy.version,
          mode: draft.mode,
          starts_at: isoValue(draft.startsAt),
          ends_at: isoValue(draft.endsAt),
          public_message: draft.publicMessage.trim() || null,
          internal_note: draft.note.trim() || null,
          reason,
        },
        csrf,
      );
      apply(updated);
      setConfirming(false);
      onToast("Manutenção atualizada.", "success");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      if (cause instanceof ApiError && cause.status === 409) {
        const current = await getSiteMaintenancePolicy(csrf).catch(() => null);
        if (current) apply(current);
      }
      setConfirming(false);
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível salvar a manutenção.",
      );
    } finally {
      setBusy(false);
    }
  }

  const showValue = (field: string, value: string) => {
    if (!value) return "Não definido";
    if (field === "starts_at" || field === "ends_at")
      return formatIso(isoValue(value) ?? value);
    return value;
  };

  return (
    <section className="page maint" aria-labelledby="site-maintenance-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operação do site</p>
          <h1 id="site-maintenance-title" className="page-title">
            Manutenção
          </h1>
          <p className="page-subtitle">
            Controle a disponibilidade do site e da API pública. O painel e a
            conciliação de pagamentos seguem acessíveis.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="card maint-loading" role="status">
          Carregando configuração…
        </div>
      ) : error && !policy ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : (
        policy && (
          <div className="maint-body">
            <aside className="maint-status" data-state={state}>
              <span className={`badge ${view.tone}`} role="status">
                {view.label}
              </span>
              <h2>{view.headline}</h2>
              <p>{view.detail}</p>
              {policy.enabled && (
                <p className="maint-window">
                  {describeWindow(policy.starts_at, policy.ends_at, formatIso)}
                </p>
              )}
              <dl className="maint-facts">
                <div>
                  <dt>Modo</dt>
                  <dd>
                    {policy.mode === "off" && "Disponível"}
                    {policy.mode === "restricted" && "Em preparação — consultas e pagamentos bloqueados"}
                    {policy.mode === "full" && "Em manutenção — tudo bloqueado para visitantes"}
                  </dd>
                </div>
                <div>
                  <dt>Continua funcionando</dt>
                  <dd>Painel da equipe e conciliação de pagamentos</dd>
                </div>
                <div>
                  <dt>Versão da configuração</dt>
                  <dd>
                    {policy.version}
                    {policy.updated_at
                      ? ` · salva em ${formatIso(policy.updated_at)}`
                      : ""}
                  </dd>
                </div>
              </dl>
            </aside>

            <form
              className="maint-form"
              autoComplete="off"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (changes.length > 0 && !problem) setConfirming(true);
              }}
            >
              <fieldset className="maint-section">
                <legend>Modo de acesso</legend>
                <div
                  className="maint-choice"
                  role="radiogroup"
                  aria-label="Modo de acesso"
                >
                  <label data-checked={draft.mode === "off"}>
                    <input
                      type="radio"
                      name="maint-mode"
                      checked={draft.mode === "off"}
                      onChange={() => set("mode", "off" as MaintenanceMode)}
                    />
                    <span>
                      <strong>Site disponível</strong>
                      <small>Visitantes acessam normalmente.</small>
                    </span>
                  </label>
                  <label data-checked={draft.mode === "restricted"} data-tone="info">
                    <input
                      type="radio"
                      name="maint-mode"
                      checked={draft.mode === "restricted"}
                      onChange={() => set("mode", "restricted" as MaintenanceMode)}
                    />
                    <span>
                      <strong>Em preparação</strong>
                      <small>
                        Site institucional no ar; consultas, pagamentos e login
                        bloqueados.
                      </small>
                    </span>
                  </label>
                  <label data-checked={draft.mode === "full"} data-tone="warning">
                    <input
                      type="radio"
                      name="maint-mode"
                      checked={draft.mode === "full"}
                      onChange={() => set("mode", "full" as MaintenanceMode)}
                    />
                    <span>
                      <strong>Em manutenção</strong>
                      <small>
                        Visitantes veem a página de manutenção; a API pública
                        responde indisponível.
                      </small>
                    </span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="maint-section" disabled={draft.mode === "off"}>
                <legend>Janela</legend>
                <div className="maint-dates">
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="maint-start">
                      Início
                    </label>
                    <input
                      id="maint-start"
                      className="input"
                      type="datetime-local"
                      value={draft.startsAt}
                      aria-invalid={!!problem}
                      onChange={(event) => set("startsAt", event.target.value)}
                    />
                    <span className="form-hint">
                      Opcional. Vazio começa assim que você salvar.
                    </span>
                  </div>
                  <div className="form-field">
                    <label className="form-field-label" htmlFor="maint-end">
                      Término
                    </label>
                    <input
                      id="maint-end"
                      className="input"
                      type="datetime-local"
                      value={draft.endsAt}
                      aria-invalid={!!problem}
                      aria-describedby={
                        problem ? "maint-window-error" : undefined
                      }
                      onChange={(event) => set("endsAt", event.target.value)}
                    />
                    <span className="form-hint">
                      Opcional. Vazio fica até você desligar.
                    </span>
                  </div>
                </div>
                <div
                  className="maint-presets"
                  role="group"
                  aria-label="Duração rápida"
                >
                  <span>Duração a partir do início:</span>
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.minutes}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        set(
                          "endsAt",
                          presetEnd(draft.startsAt, preset.minutes, now),
                        )
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!draft.endsAt}
                    onClick={() => set("endsAt", "")}
                  >
                    Sem término
                  </button>
                </div>
                {problem && (
                  <p
                    id="maint-window-error"
                    className="maint-error"
                    role="alert"
                  >
                    {problem}
                  </p>
                )}
                {draft.mode === "off" && (
                  <p className="form-hint">
                    A janela só vale quando o modo não é "Disponível".
                  </p>
                )}
              </fieldset>

              <fieldset className="maint-section">
                <legend>Mensagens</legend>
                <div className="form-field">
                  <label className="form-field-label" htmlFor="maint-public">
                    Mensagem para visitantes
                  </label>
                  <textarea
                    id="maint-public"
                    className="input"
                    rows={2}
                    maxLength={240}
                    value={draft.publicMessage}
                    placeholder="Estamos atualizando o serviço. Volte em breve."
                    onChange={(event) =>
                      set("publicMessage", event.target.value)
                    }
                  />
                  <span className="form-hint">
                    Opcional · aparece na página de manutenção ·{" "}
                    {draft.publicMessage.length}/240
                  </span>
                </div>
                <div className="form-field">
                  <label className="form-field-label" htmlFor="maint-note">
                    Nota interna
                  </label>
                  <textarea
                    id="maint-note"
                    className="input"
                    rows={3}
                    maxLength={500}
                    value={draft.note}
                    onChange={(event) => set("note", event.target.value)}
                  />
                  <span className="form-hint">
                    Opcional · visível somente à equipe · {draft.note.length}
                    /500
                  </span>
                </div>
              </fieldset>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <div className="maint-actions">
                <span className="form-hint" role="status">
                  {changes.length === 0
                    ? "Nenhuma alteração para salvar."
                    : `${changes.length} ${changes.length === 1 ? "alteração" : "alterações"} não salva${changes.length === 1 ? "" : "s"}.`}
                </span>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-md"
                    disabled={changes.length === 0 || busy}
                    onClick={() => {
                      setDraft(draftFrom(policy));
                      setError("");
                    }}
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                    disabled={changes.length === 0 || !!problem || busy}
                  >
                    Revisar e salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        )
      )}

      <ConfirmDialog
        open={confirming}
        title={
          takesSiteDown
            ? draft.mode === "restricted"
              ? "Ativar modo Em preparação?"
              : "Colocar o site em manutenção?"
            : "Salvar a configuração de manutenção?"
        }
        description={
          takesSiteDown
            ? draftState === "scheduled"
              ? "O site continua no ar até o início da janela."
              : draft.mode === "restricted"
                ? "Assim que salvar, consultas, pagamentos e login ficam bloqueados. O site institucional continua no ar."
                : "Assim que salvar, visitantes veem a página de manutenção e a API pública responde indisponível."
            : "Confira o que vai mudar. Cada alteração fica registrada no histórico."
        }
        details={changes.map((change) => ({
          label: change.label,
          value: `${showValue(change.field, change.from)} → ${showValue(change.field, change.to)}`,
        }))}
        reason={{ label: "Motivo da alteração", min: 5, max: 500 }}
        confirmLabel={takesSiteDown ? "Salvar e aplicar" : "Salvar"}
        tone={takesSiteDown ? "danger" : "primary"}
        busy={busy}
        onConfirm={(reason) => void save(reason)}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
