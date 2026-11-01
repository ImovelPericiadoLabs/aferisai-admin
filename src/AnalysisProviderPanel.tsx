import { useState } from "react";
import {
  ApiError,
  previewAnalysisProviderActivation,
  type AnalysisProviderAccount,
  type AnalysisProviderKind,
} from "./api";
import { statusLabel } from "./display-labels";
import {
  canActivate,
  formToLimits,
  isVersionConflict,
  limitsToForm,
  validateExternalReserved,
  validateProfileHash,
  type LimitsForm,
} from "./provider-model";
import { providerStatusTone } from "./status-tones";
import { AnalysisProviderActivationSection } from "./AnalysisProviderActivationSection";
import {
  AnalysisProviderConfirmDialogs,
  type ProviderAsk,
} from "./AnalysisProviderConfirmDialogs";
import { AnalysisProviderIdentitySection } from "./AnalysisProviderIdentitySection";
import { AnalysisProviderLimitsSection } from "./AnalysisProviderLimitsSection";

export const kindLabels: Record<AnalysisProviderKind, string> = {
  vertex_service_account: "Gemini · conta de serviço",
  gemini_api_key: "Gemini · chave de API",
  openai_api_key: "OpenAI · chave de API",
  openai_compatible: "API compatível com OpenAI",
};

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
  const [previewModel, setPreviewModel] = useState("");
  const [credentialChecked, setCredentialChecked] = useState(false);
  const [notice, setNotice] = useState("");
  const [ask, setAsk] = useState<ProviderAsk>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (account.version !== seenVersion) {
    setSeenVersion(account.version);
    setForm(limitsToForm(account));
    setProfile("");
    setPreviewModel("");
    setCredentialChecked(false);
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

  async function checkActivation() {
    setBusy(true);
    setError("");
    setProfile("");
    try {
      const result = await previewAnalysisProviderActivation(account.id);
      setProfile(result.execution_profile_sha256);
      setPreviewModel(result.model);
      setCredentialChecked(result.credential_checked);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível conferir a conta agora.",
        );
    } finally {
      setBusy(false);
    }
  }

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
        <AnalysisProviderIdentitySection
          account={account}
          copied={copied}
          onCopy={() => void copyHash()}
        />

        <AnalysisProviderLimitsSection
          account={account}
          editable={editable}
          form={form}
          parsed={parsed}
          busy={busy}
          onForm={setForm}
          onSave={requestSave}
        />

        {account.status === "draft" && (
          <AnalysisProviderActivationSection
            account={account}
            activation={activation}
            reserved={reserved}
            reservedCheck={reservedCheck}
            profile={profile}
            profileCheck={profileCheck}
            previewModel={previewModel}
            credentialChecked={credentialChecked}
            busy={busy}
            onReserved={setReserved}
            onCheck={() => void checkActivation()}
            onActivate={() => setAsk("activate")}
          />
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

      <AnalysisProviderConfirmDialogs
        account={account}
        ask={ask}
        form={form}
        parsed={parsed}
        previewModel={previewModel}
        profile={profile}
        reservedCheck={reservedCheck}
        profileCheck={profileCheck}
        busy={busy}
        csrf={csrf}
        run={run}
        onCancel={() => setAsk(null)}
      />
    </>
  );
}
