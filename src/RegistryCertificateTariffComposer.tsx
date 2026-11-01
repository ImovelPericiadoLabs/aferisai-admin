import type { FormEvent } from "react";
import type { RegistryCertificateKind } from "./api";
import { EvidenceFileField } from "./RegistryEvidenceFileField";
import {
  certificateKinds as kinds,
  money,
} from "./registry-optional-tariffs-model";
import {
  Composer,
  ComposerSection,
  ComposerSummary,
  Delta,
} from "./SupplierUi";
import type {
  CertificateTariffForm,
  Reviewing,
} from "./useRegistryTariffForms";

export function RegistryCertificateTariffComposer({
  form,
  active,
  busy,
  error,
  setError,
  reviewing,
  setReviewing,
  onPublish,
  onReview,
}: {
  form: CertificateTariffForm;
  active: boolean;
  busy: boolean;
  error: string;
  setError: (message: string) => void;
  reviewing: Reviewing;
  setReviewing: (value: Reviewing) => void;
  onPublish: () => void;
  onReview: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const {
    kind,
    setKind,
    state,
    setState,
    cost,
    setCost,
    evidence,
    setEvidence,
    evidenceMode,
    setEvidenceMode,
    sampleDocument,
    setSampleDocument,
    sampleCharge,
    setSampleCharge,
    proofConfirmed,
    setProofConfirmed,
    operationalAttested,
    setOperationalAttested,
    reason,
    setReason,
    setOpen,
    attempted,
    reasonRange,
    cents,
    current,
    states,
    missing,
  } = form;
  return (
    <Composer
      title="Nova tarifa de certidão"
      steps={[
        { id: "values", label: "Valores", state: states[0] },
        { id: "evidence", label: "Evidência", state: states[1] },
        { id: "review", label: "Revisão", state: states[2] },
      ]}
      onClose={() => !busy && setOpen(false)}
      summary={
        <ComposerSummary
          title="Resumo da nova versão"
          total={Number.isNaN(cents) ? "—" : money(cents)}
          delta={
            !Number.isNaN(cents) && current ? (
              <>
                <Delta current={cents} previous={current.unit_cost_cents} />{" "}
                <small className="sup-muted">
                  atual {money(current.unit_cost_cents)}
                </small>
              </>
            ) : undefined
          }
          rows={[
            {
              label: "Tipo",
              value: kinds.find((item) => item.value === kind)?.label ?? kind,
            },
            ...(kind === "estadual"
              ? [
                  {
                    label: "UF",
                    value: state.trim().toUpperCase() || "—",
                  },
                ]
              : []),
            {
              label: "Comprovantes",
              value: operationalAttested
                ? "Declaração administrativa"
                : sampleDocument && sampleCharge
                  ? "Arquivos conferidos"
                  : "Sem aprovação operacional",
            },
            { label: "Vigência", value: "Até atualização" },
          ]}
          footer={
            reviewing === "certificate" ? (
              <div
                className="sup-review"
                role="group"
                aria-label="Confirmar tarifa"
              >
                <p>
                  Publicar{" "}
                  <strong>{Number.isNaN(cents) ? "—" : money(cents)}</strong>{" "}
                  para {kind}? Fica na auditoria e vale até a próxima
                  atualização.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  disabled={busy}
                  onClick={onPublish}
                >
                  {busy ? "Publicando…" : "Confirmar e publicar"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  disabled={busy}
                  onClick={() => setReviewing(null)}
                >
                  Voltar
                </button>
              </div>
            ) : (
              <button
                type="submit"
                form="certificate-form"
                className="btn btn-primary btn-md"
                disabled={!active || busy}
              >
                Revisar tarifa
              </button>
            )
          }
        />
      }
    >
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {attempted && missing().length > 0 && (
        <p className="alert alert-danger" role="alert">
          Falta ou está inválido: {missing().join("; ")}.
        </p>
      )}
      <form
        id="certificate-form"
        className="sup-composer-form"
        onSubmit={onReview}
        noValidate
      >
        <ComposerSection
          title="Valores"
          state={states[0]}
          recap={`${kinds.find((item) => item.value === kind)?.label ?? kind} · ${Number.isNaN(cents) ? "—" : money(cents)}`}
        >
          <label>
            Tipo
            <select
              className="input"
              value={kind}
              disabled={!active || busy}
              onChange={(event) => {
                setKind(event.target.value as RegistryCertificateKind);
                setState("");
                setReviewing(null);
              }}
            >
              {kinds.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {kind === "estadual" && (
            <label>
              UF
              <input
                className="input"
                value={state}
                maxLength={2}
                disabled={!active || busy}
                onChange={(event) => setState(event.target.value)}
              />
            </label>
          )}
          <label>
            Custo total por chamada (R$)
            <input
              className="input"
              inputMode="decimal"
              placeholder="0,24"
              value={cost}
              disabled={!active || busy}
              onChange={(event) => setCost(event.target.value)}
            />
          </label>
        </ComposerSection>

        <ComposerSection
          title="Evidência"
          state={states[1]}
          recap={`${evidenceMode === "admin_declaration" ? "Declaração administrativa" : `Arquivo ${evidence.slice(0, 8)}…`} · ${reason.trim().slice(0, 40)}`}
        >
          <label>
            Como você conferiu o preço?
            <select
              className="input"
              value={evidenceMode}
              disabled={!active || busy}
              onChange={(event) => {
                setEvidenceMode(event.target.value as typeof evidenceMode);
                setSampleDocument("");
                setSampleCharge("");
                setProofConfirmed(false);
                setOperationalAttested(false);
              }}
            >
              <option value="admin_declaration">
                Declaro o preço conferido
              </option>
              <option value="supplier_file">Tenho arquivo do fornecedor</option>
            </select>
            <small>
              A declaração é sua decisão auditada; não é documento do
              fornecedor.
            </small>
          </label>
          {evidenceMode === "supplier_file" && (
            <EvidenceFileField
              label="Tabela de preços"
              value={evidence}
              disabled={!active || busy}
              onChange={setEvidence}
              onError={setError}
            />
          )}
          <label>
            Motivo
            <textarea
              className="input"
              rows={3}
              maxLength={reasonRange.max}
              value={reason}
              disabled={!active || busy}
              onChange={(event) => setReason(event.target.value)}
            />
            <small>Fica na auditoria. Sem senhas, tokens ou matrículas.</small>
          </label>
          {evidenceMode === "admin_declaration" ? (
            <label>
              <input
                type="checkbox"
                checked={operationalAttested}
                disabled={!active || busy}
                onChange={(event) =>
                  setOperationalAttested(event.target.checked)
                }
              />
              Aprovo disponibilizar este tipo por melhor esforço, com preço e
              operação declarados sob minha responsabilidade.
            </label>
          ) : (
            <details>
              <summary>Comprovantes de entrega</summary>
              <EvidenceFileField
                label="PDF recebido"
                value={sampleDocument}
                disabled={!active || busy}
                accept="application/pdf"
                onChange={setSampleDocument}
                onError={setError}
              />
              <EvidenceFileField
                label="Registro do débito"
                value={sampleCharge}
                disabled={!active || busy}
                onChange={setSampleCharge}
                onError={setError}
              />
              <label>
                <input
                  type="checkbox"
                  checked={proofConfirmed}
                  disabled={!active || busy}
                  onChange={(event) => setProofConfirmed(event.target.checked)}
                />
                Conferi visualmente o PDF e o débito
              </label>
            </details>
          )}
        </ComposerSection>
      </form>
    </Composer>
  );
}
