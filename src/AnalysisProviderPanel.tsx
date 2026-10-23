import { useState } from "react";
import {
  ApiError,
  activateAnalysisProviderAccount,
  suspendAnalysisProviderAccount,
  updateAnalysisProviderLimits,
  type AnalysisProviderAccount,
  type AnalysisProviderKind,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { statusLabel } from "./display-labels";
import {
  activationBody,
  canActivate,
  formToLimits,
  formatCostPerDay,
  isVersionConflict,
  limitsToForm,
  shortHash,
  validateExternalReserved,
  validateProfileHash,
  type LimitsForm,
} from "./provider-model";
import { providerStatusTone } from "./status-tones";

export const kindLabels: Record<AnalysisProviderKind, string> = {
  vertex_service_account: "Gemini · conta de serviço",
  gemini_api_key: "Gemini · chave de API",
  openai_api_key: "OpenAI · chave de API",
  openai_compatible: "API compatível com OpenAI",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const REASON = { label: "Motivo", min: 10, max: 500 };

type Ask = "limits" | "activate" | "suspend" | null;

const limitFields: { key: keyof LimitsForm; label: string; step: string }[] = [
  { key: "maxConcurrent", label: "Chamadas simultâneas", step: "1" },
  { key: "dailyLimit", label: "Chamadas por dia", step: "1" },
  { key: "rpm", label: "Requisições por minuto", step: "1" },
  { key: "tpm", label: "Tokens por minuto", step: "1" },
  { key: "dailyCostReais", label: "Teto diário (R$)", step: "0.01" },
  { key: "priority", label: "Prioridade (menor vem primeiro)", step: "1" },
];

export function AnalysisProviderPanel({
  account,
  csrf,
  onChanged,
  onUnauthorized,
  onClose,
}: {
  account: AnalysisProviderAccount;
  csrf: string;
  onChanged: () => Promise<void>;
  onUnauthorized: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<LimitsForm>(() => limitsToForm(account));
  const [seenVersion, setSeenVersion] = useState(account.version);
  const [reserved, setReserved] = useState("0");
  const [profile, setProfile] = useState("");
  const [notice, setNotice] = useState("");
  const [ask, setAsk] = useState<Ask>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (account.version !== seenVersion) {
    setSeenVersion(account.version);
    setForm(limitsToForm(account));
  }

  const editable = account.status !== "suspended";
  const reservedCheck = validateExternalReserved(reserved);
  const profileCheck = validateProfileHash(profile);
  const activation = canActivate(account);

  async function run(task: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      setAsk(null);
      await onChanged();
      setNotice(success);
    } catch (cause) {
      setAsk(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (isVersionConflict(cause)) {
        await onChanged();
        setError(
          "A conta mudou ou o estado dela já não permite esta ação. Os dados foram recarregados.",
        );
      } else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível concluir a ação. Tente novamente.",
        );
    } finally {
      setBusy(false);
    }
  }

  function requestSave() {
    const result = formToLimits(form);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError("");
    setAsk("limits");
  }

  async function copyHash() {
    if (!account.execution_profile_sha256) return;
    try {
      await navigator.clipboard.writeText(account.execution_profile_sha256);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const parsed = formToLimits(form);

  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="prov-title" id="prov-panel-title">
            {account.label}
          </h2>
          <div className="prov-badges">
            <span className={`badge ${providerStatusTone(account.status)}`}>
              {statusLabel(account.status)}
            </span>
            <span className="prov-sub">
              {kindLabels[account.kind]} · {account.model}
            </span>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-label="Fechar"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="detail-panel-body">
        {error && (
          <div className="alert alert-danger form-alert" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="alert alert-success form-alert" role="status">
            {notice}
          </div>
        )}
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Identificação</h3>
          <dl className="detail-panel-field">
            <dt>Região</dt>
            <dd>{account.location || "—"}</dd>
            <dt>Pool de capacidade</dt>
            <dd>{account.pool_key}</dd>
            {account.base_url && (
              <>
                <dt>Endpoint</dt>
                <dd>{account.base_url}</dd>
              </>
            )}
            <dt>Credencial</dt>
            <dd>
              {account.credential_hint}
              <span className="prov-hint"> · não pode ser visualizada</span>
            </dd>
            <dt>Perfil de execução</dt>
            <dd>
              {shortHash(account.execution_profile_sha256)}
              {account.execution_profile_sha256 && (
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => void copyHash()}
                >
                  {copied ? "Copiado" : "Copiar"}
                </button>
              )}
            </dd>
            <dt>Versão</dt>
            <dd>{account.version}</dd>
            <dt>Atualizada em</dt>
            <dd>{dateTime.format(new Date(account.updated_at))}</dd>
          </dl>
        </section>

        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Limites</h3>
          {editable ? (
            <>
              <div className="form-row">
                {limitFields.map(({ key, label, step }) => (
                  <div className="form-field" key={key}>
                    <label className="form-field-label" htmlFor={`prov-${key}`}>
                      {label}
                    </label>
                    <input
                      id={`prov-${key}`}
                      className="input"
                      type="number"
                      step={step}
                      min="0"
                      value={form[key]}
                      aria-invalid={!parsed.ok && parsed.field === key}
                      onChange={(event) =>
                        setForm({ ...form, [key]: event.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary btn-md prov-action"
                type="button"
                disabled={busy}
                onClick={requestSave}
              >
                Salvar limites
              </button>
            </>
          ) : (
            <dl className="detail-panel-field">
              <dt>Chamadas simultâneas</dt>
              <dd>{account.max_concurrent}</dd>
              <dt>Chamadas por dia</dt>
              <dd>{account.daily_limit}</dd>
              <dt>Requisições por minuto</dt>
              <dd>{account.rpm}</dd>
              <dt>Tokens por minuto</dt>
              <dd>{account.tpm}</dd>
              <dt>Teto diário</dt>
              <dd>{formatCostPerDay(account.daily_cost_cents)}</dd>
              <dt>Prioridade</dt>
              <dd>{account.priority}</dd>
            </dl>
          )}
        </section>

        {account.status === "draft" && (
          <section className="detail-panel-section">
            <h3 className="detail-panel-section-title">Ativar conta</h3>
            {!activation.ok ? (
              <p className="prov-note">{activation.reason}</p>
            ) : (
              <>
                <div className="form-field prov-reserved">
                  <label className="form-field-label" htmlFor="prov-reserved">
                    Reserva externa (0 a 12 chamadas)
                  </label>
                  <input
                    id="prov-reserved"
                    className="input"
                    type="number"
                    min="0"
                    max="12"
                    step="1"
                    value={reserved}
                    aria-invalid={!reservedCheck.ok}
                    onChange={(event) => setReserved(event.target.value)}
                  />
                  <span className="form-hint">
                    {reservedCheck.ok
                      ? "Chamadas simultâneas reservadas a outros sistemas que usam o mesmo projeto."
                      : reservedCheck.message}
                  </span>
                </div>
                <div className="form-field">
                  <label className="form-field-label" htmlFor="prov-profile">
                    Perfil medido (SHA-256)
                  </label>
                  <input
                    id="prov-profile"
                    className="input prov-mono"
                    value={profile}
                    maxLength={80}
                    spellCheck={false}
                    aria-invalid={profile !== "" && !profileCheck.ok}
                    onChange={(event) => setProfile(event.target.value)}
                  />
                  <span className="form-hint">
                    {profile !== "" && !profileCheck.ok
                      ? profileCheck.message
                      : "Hash do perfil medido para esta conta, gerado na medição do backend. O servidor confere o valor antes de ativar."}
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-md prov-action"
                  type="button"
                  disabled={busy || !reservedCheck.ok || !profileCheck.ok}
                  onClick={() => setAsk("activate")}
                >
                  Ativar conta
                </button>
              </>
            )}
          </section>
        )}

        {account.status === "suspended" && (
          <p className="prov-note">
            Esta conta está suspensa. Nesta versão o backend não oferece
            reativação.
          </p>
        )}
      </div>
      <div className="detail-panel-footer">
        {editable && (
          <button
            className="btn btn-ghost btn-md btn-ghost-danger"
            type="button"
            disabled={busy}
            onClick={() => setAsk("suspend")}
          >
            Suspender conta
          </button>
        )}
        <button
          className="btn btn-ghost btn-md"
          type="button"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>

      <ConfirmDialog
        open={ask === "limits"}
        title="Salvar novos limites?"
        description="Os novos limites passam a valer para esta conta."
        details={[
          { label: "Conta", value: account.label },
          {
            label: "Teto diário",
            value: parsed.ok
              ? formatCostPerDay(parsed.limits.daily_cost_cents)
              : "",
          },
          { label: "Requisições por minuto", value: form.rpm },
        ]}
        reason={REASON}
        confirmLabel="Salvar limites"
        busy={busy}
        onConfirm={(reason) => {
          const result = formToLimits(form);
          if (result.ok)
            void run(
              () =>
                updateAnalysisProviderLimits(
                  account.id,
                  result.limits,
                  account.version,
                  reason,
                  csrf,
                ),
              "Limites salvos.",
            );
        }}
        onCancel={() => setAsk(null)}
      />
      <ConfirmDialog
        open={ask === "activate"}
        title="Ativar esta conta?"
        description="A conta sai de rascunho e fica ativa com o perfil de execução conferido abaixo."
        details={[
          { label: "Conta", value: account.label },
          { label: "Modelo", value: "gemini-3.5-flash-lite" },
          { label: "Reserva externa", value: reservedCheck.value },
          {
            label: "Perfil",
            value: shortHash(account.execution_profile_sha256),
          },
        ]}
        reason={REASON}
        confirmLabel="Ativar conta"
        busy={busy}
        onConfirm={(reason) => {
          const body = activationBody(
            account,
            reservedCheck.value,
            reason,
            profileCheck.value,
          );
          void run(
            () => activateAnalysisProviderAccount(account.id, body, csrf),
            "Conta ativada.",
          );
        }}
        onCancel={() => setAsk(null)}
      />
      <ConfirmDialog
        open={ask === "suspend"}
        tone="danger"
        title="Suspender esta conta?"
        description="A conta deixa de poder receber chamadas. Nesta versão não há reativação pelo painel."
        details={[{ label: "Conta", value: account.label }]}
        reason={REASON}
        confirmLabel="Suspender conta"
        busy={busy}
        onConfirm={(reason) =>
          void run(
            () =>
              suspendAnalysisProviderAccount(
                account.id,
                account.version,
                reason,
                csrf,
              ),
            "Conta suspensa.",
          )
        }
        onCancel={() => setAsk(null)}
      />
    </>
  );
}
