import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getSiteMaintenancePolicy,
  updateSiteMaintenancePolicy,
  type SiteMaintenancePolicy,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  draftChanges,
  isoValue,
  maintenanceState,
  windowProblem,
  type MaintenanceDraft,
} from "./maintenance-model";
import { MaintenanceForm } from "./MaintenanceForm";
import { MaintenanceStatusPanel } from "./MaintenanceStatusPanel";
import { draftFrom, emptyDraft, formatIso } from "./site-maintenance-view";
import "./site-maintenance.css";

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
          enabled: draft.mode !== "off",
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
            <MaintenanceStatusPanel policy={policy} state={state} />
            <MaintenanceForm
              draft={draft}
              set={set}
              problem={problem}
              now={now}
              error={error}
              changeCount={changes.length}
              busy={busy}
              onSubmit={() => {
                if (changes.length > 0 && !problem) setConfirming(true);
              }}
              onDiscard={() => {
                setDraft(draftFrom(policy));
                setError("");
              }}
            />
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
