import type { FormEvent } from "react";
import type { RegistryArispTariff, RegistrySupplierAccount } from "./api";
import { EvidenceFileField } from "./RegistryEvidenceFileField";
import { money } from "./registry-optional-tariffs-model";
import {
  Composer,
  ComposerSection,
  ComposerSummary,
  Delta,
} from "./SupplierUi";
import type { ArispTariffForm, Reviewing } from "./useRegistryTariffForms";

export function RegistryArispTariffComposer({
  form,
  active,
  busy,
  error,
  setError,
  reviewing,
  setReviewing,
  onPublish,
  onReview,
  arisp,
  otherProvider,
  otherAccounts,
}: {
  form: ArispTariffForm;
  active: boolean;
  busy: boolean;
  error: string;
  setError: (message: string) => void;
  reviewing: Reviewing;
  setReviewing: (value: Reviewing) => void;
  onPublish: () => void;
  onReview: (event: FormEvent<HTMLFormElement>) => void;
  arisp: RegistryArispTariff[];
  otherProvider: string;
  otherAccounts: RegistrySupplierAccount[];
}) {
  const {
    linkedAccount,
    setLinkedAccount,
    orderFee,
    setOrderFee,
    downloadFee,
    setDownloadFee,
    evidence,
    setEvidence,
    evidenceMode,
    setEvidenceMode,
    certificateType,
    setCertificateType,
    certificateTypeEvidence,
    setCertificateTypeEvidence,
    typeConfirmed,
    setTypeConfirmed,
    reason,
    setReason,
    setOpen,
    attempted,
    reasonRange,
    order,
    download,
    budget,
    states,
    missing,
  } = form;
  return (
    <Composer
      title="Nova tarifa da API de certidão"
      steps={[
        { id: "values", label: "Valores", state: states[0] },
        { id: "evidence", label: "Evidência", state: states[1] },
        { id: "review", label: "Revisão", state: states[2] },
      ]}
      onClose={() => !busy && setOpen(false)}
      summary={
        <ComposerSummary
          title="Resumo da nova versão"
          total={budget === null ? "—" : money(budget)}
          delta={
            budget !== null && arisp[0] ? (
              <>
                <Delta current={budget} previous={arisp[0].budget_cents} />{" "}
                <small className="sup-muted">
                  atual {money(arisp[0].budget_cents)}
                </small>
              </>
            ) : undefined
          }
          rows={[
            {
              label: "Pedido",
              value: Number.isNaN(order) ? "—" : money(order),
            },
            {
              label: "3 × download",
              value: Number.isNaN(download) ? "—" : money(3 * download),
            },
            {
              label: "Tipo de ônus",
              value: certificateType.trim() || "Não comprovado",
            },
            { label: "Vigência", value: "Até atualização" },
          ]}
          footer={
            reviewing === "arisp" ? (
              <div
                className="sup-review"
                role="group"
                aria-label="Confirmar tarifa"
              >
                <p>
                  Publicar reserva da API de{" "}
                  <strong>{budget === null ? "—" : money(budget)}</strong>? Fica
                  na auditoria e vale até a próxima atualização.
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
                form="arisp-form"
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
        id="arisp-form"
        className="sup-composer-form"
        onSubmit={onReview}
        noValidate
      >
        <ComposerSection
          title="Valores"
          state={states[0]}
          recap={`Pedido ${Number.isNaN(order) ? "—" : money(order)} · download ${Number.isNaN(download) ? "—" : money(download)}`}
        >
          <label className="sup-span">
            Conta {otherProvider === "onr" ? "RI Digital" : "InfoSimples"}{" "}
            vinculada
            <select
              className="input"
              value={linkedAccount}
              disabled={!active || busy}
              onChange={(event) => setLinkedAccount(event.target.value)}
            >
              <option value="">Selecione a conta ativa</option>
              {otherAccounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pedido (R$)
            <input
              className="input"
              inputMode="decimal"
              placeholder="0,28"
              value={orderFee}
              disabled={!active || busy}
              onChange={(event) => setOrderFee(event.target.value)}
            />
          </label>
          <label>
            Cada download (R$)
            <input
              className="input"
              inputMode="decimal"
              placeholder="0,20"
              value={downloadFee}
              disabled={!active || busy}
              onChange={(event) => setDownloadFee(event.target.value)}
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
              onChange={(event) =>
                setEvidenceMode(event.target.value as typeof evidenceMode)
              }
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
          <details>
            <summary>Tipo literal de ônus (opcional)</summary>
            <label>
              tipo_certidao aceito
              <input
                className="input"
                value={certificateType}
                maxLength={80}
                disabled={!active || busy}
                onChange={(event) => setCertificateType(event.target.value)}
              />
              <small>
                Só se a conta aceitou este valor e você guardou a evidência.
              </small>
            </label>
            <EvidenceFileField
              label="Resposta do tipo aceito"
              value={certificateTypeEvidence}
              disabled={!active || busy}
              onChange={setCertificateTypeEvidence}
              onError={setError}
            />
            <label>
              <input
                type="checkbox"
                checked={typeConfirmed}
                disabled={!active || busy}
                onChange={(event) => setTypeConfirmed(event.target.checked)}
              />
              Conferi o tipo aceito na conta
            </label>
          </details>
        </ComposerSection>
      </form>
    </Composer>
  );
}
