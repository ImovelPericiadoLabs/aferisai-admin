import { useState, type FormEvent } from "react";
import {
  ApiError,
  createAnalysisProviderAccount,
  type AnalysisProviderKind,
} from "./api";
import { kindLabels } from "./AnalysisProviderPanel";
import { AnalysisProviderCredentialFieldset } from "./AnalysisProviderCredentialFieldset";
import { AnalysisProviderLimitsFieldset } from "./AnalysisProviderLimitsFieldset";
import { initialLimits, poolExamples } from "./analysis-provider-form-model";
import { summarizeServiceAccount } from "./file-preview-model";
import { formToLimits, type LimitsForm } from "./provider-model";
import { validateReason } from "./reason";

export function AnalysisProviderForm({
  csrf,
  onCreated,
  onReload,
  onUnauthorized,
  onClose,
}: {
  csrf: string;
  onCreated: () => Promise<void>;
  onReload: () => Promise<void>;
  onUnauthorized: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<AnalysisProviderKind>(
    "vertex_service_account",
  );
  const [model, setModel] = useState("gemini-3.5-flash-lite");
  const [location, setLocation] = useState("global");
  const [poolKey, setPoolKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [credential, setCredential] = useState("");
  const [limits, setLimits] = useState<LimitsForm>(initialLimits);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const reasonCheck = validateReason(reason, 10, 500);

  async function chooseFile(file: File | null) {
    if (!file) {
      setCredential("");
      setCredentialFile(null);
      setError("");
      return;
    }
    try {
      const value = await file.text();
      const summary = summarizeServiceAccount(value);
      if (!summary.ok) {
        setCredential("");
        setCredentialFile(null);
        setError(summary.message);
        return;
      }
      setCredential(value);
      setCredentialFile(file);
      setError("");
    } catch {
      setCredential("");
      setCredentialFile(null);
      setError("O arquivo da conta de serviço precisa conter JSON válido.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = formToLimits(limits);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (!credential) {
      setError(
        kind === "vertex_service_account"
          ? "Escolha o arquivo JSON da conta de serviço."
          : "Informe a chave ou o token.",
      );
      return;
    }
    if (!reasonCheck.ok) {
      setError(reasonCheck.message);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await createAnalysisProviderAccount(
        {
          label: label.trim(),
          kind,
          model: model.trim(),
          location: location.trim() || "global",
          pool_key: poolKey.trim(),
          base_url: baseUrl.trim() || null,
          secret: credential,
          ...parsed.limits,
          reason: reason.trim(),
        },
        csrf,
      );
      setCredential("");
      setCredentialFile(null);
      await onCreated();
    } catch (cause) {
      setCredential("");
      setCredentialFile(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        await onReload();
        setError(
          `${
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível confirmar o cadastro."
          } A lista foi atualizada: confira antes de tentar de novo e reenvie o segredo.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="prov-title" id="prov-panel-title">
            Nova conta de provedor
          </h2>
          <p className="prov-sub">
            A conta nasce em rascunho. Ative depois de conferir o perfil.
          </p>
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
      <form
        id="provider-form"
        className="detail-panel-body"
        onSubmit={(event) => void submit(event)}
      >
        {error && (
          <div className="alert alert-danger form-alert" role="alert">
            {error}
          </div>
        )}
        <fieldset className="form-section">
          <legend className="form-section-title">Conta</legend>
          <div className="form-field">
            <label className="form-field-label" htmlFor="prov-label">
              Nome interno
            </label>
            <input
              id="prov-label"
              className="input"
              value={label}
              required
              maxLength={100}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="prov-kind">
              Provedor
            </label>
            <select
              id="prov-kind"
              className="input"
              value={kind}
              onChange={(event) => {
                const next = event.target.value as AnalysisProviderKind;
                setKind(next);
                setModel(
                  next === "vertex_service_account"
                    ? "gemini-3.5-flash-lite"
                    : "",
                );
                setLocation("global");
                setPoolKey("");
                setCredential("");
                setCredentialFile(null);
              }}
            >
              {(["vertex_service_account", "openai_api_key"] as const).map(
                (value) => (
                  <option value={value} key={value}>
                    {kindLabels[value]}
                  </option>
                ),
              )}
            </select>
            <span className="form-hint">
              Contas Gemini por chave e APIs compatíveis ainda não têm adaptador
              de análise aprovado.
            </span>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-field-label" htmlFor="prov-model">
                Modelo
              </label>
              <input
                id="prov-model"
                className="input"
                value={model}
                required
                maxLength={100}
                readOnly={kind === "vertex_service_account"}
                placeholder="Ex.: gpt-5.4-mini-2026-03-17"
                onChange={(event) => setModel(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-field-label" htmlFor="prov-location">
                Região
              </label>
              <input
                id="prov-location"
                className="input"
                value={location}
                maxLength={80}
                required
                readOnly
                placeholder="global"
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="prov-pool">
              Pool de capacidade compartilhada
            </label>
            <input
              id="prov-pool"
              className="input"
              value={poolKey}
              required
              minLength={3}
              maxLength={160}
              pattern="[A-Za-z0-9._:-]+"
              placeholder={poolExamples[kind]}
              onChange={(event) => setPoolKey(event.target.value)}
            />
            <span className="form-hint">
              {kind === "vertex_service_account"
                ? "Contas do mesmo projeto GCP usam o mesmo pool; o ID deve coincidir com o do JSON."
                : "Identifique o projeto OpenAI deste token. O acesso ao modelo será conferido antes da ativação; o agrupamento de quota continua declarado por você."}
            </span>
          </div>
          {kind === "openai_compatible" && (
            <div className="form-field">
              <label className="form-field-label" htmlFor="prov-base">
                URL base HTTPS
              </label>
              <input
                id="prov-base"
                className="input"
                type="url"
                value={baseUrl}
                required
                placeholder="https://api.exemplo.com/v1"
                onChange={(event) => setBaseUrl(event.target.value)}
              />
            </div>
          )}
        </fieldset>

        <AnalysisProviderCredentialFieldset
          kind={kind}
          credential={credential}
          credentialFile={credentialFile}
          busy={busy}
          onCredential={setCredential}
          onFile={(next) => void chooseFile(next)}
        />

        <AnalysisProviderLimitsFieldset limits={limits} onChange={setLimits} />

        <fieldset className="form-section">
          <legend className="form-section-title">Justificativa</legend>
          <div className="form-field">
            <label className="form-field-label" htmlFor="prov-reason">
              Motivo do cadastro
            </label>
            <input
              id="prov-reason"
              className="input"
              value={reason}
              required
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
            <span className="form-hint">
              {reason !== "" && !reasonCheck.ok
                ? reasonCheck.message
                : "De 10 a 500 caracteres. Fica registrado no histórico."}
            </span>
          </div>
        </fieldset>
      </form>
      <div className="detail-panel-footer">
        <button
          className="btn btn-primary btn-md"
          type="submit"
          form="provider-form"
          disabled={busy || !credential}
        >
          {busy ? "Salvando…" : "Adicionar conta"}
        </button>
        <button
          className="btn btn-ghost btn-md"
          type="button"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </>
  );
}
