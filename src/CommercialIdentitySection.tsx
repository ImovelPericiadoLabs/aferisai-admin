import type { RegistryCommercialTermsCreate } from "./api";
import { ComposerSection } from "./SupplierUi";
import type { StepState } from "./account-model";
import {
  DeclarationPanel,
  FilePickButton,
  LabelRow,
  MiniButton,
} from "./EvidenceTools";
import type { CommercialErrors } from "./commercial-form-model";
import type {
  SetDraftField,
  ShownError,
} from "./registry-commercial-terms-model";

export function CommercialIdentitySection({
  state,
  draft,
  errors,
  shown,
  active,
  busy,
  feeChanged,
  evidenceNote,
  declaration,
  onSuggestVersion,
  onGenerateEvidence,
  onHashFile,
  onEvidenceNote,
  set,
}: {
  state: StepState;
  draft: RegistryCommercialTermsCreate;
  errors: CommercialErrors;
  shown: ShownError;
  active: boolean;
  busy: boolean;
  feeChanged: boolean;
  evidenceNote: string;
  declaration: { text: string; hash: string } | null;
  onSuggestVersion: () => void;
  onGenerateEvidence: () => Promise<string | null>;
  onHashFile: (bytes: ArrayBuffer, name: string) => Promise<void>;
  onEvidenceNote: (note: string) => void;
  set: SetDraftField;
}) {
  return (
    <ComposerSection
      title="Versão e evidência"
      state={state}
      recap={`${draft.version.trim()} · ${draft.reason.trim().slice(0, 40)}`}
    >
      <div className="sup-field">
        <LabelRow htmlFor="cm-version" text="Identificador da nova versão">
          <MiniButton
            title="Sugere o próximo identificador a partir da versão vigente"
            disabled={!active || busy}
            onClick={onSuggestVersion}
          >
            Gerar
          </MiniButton>
        </LabelRow>
        <input
          className="input"
          id="cm-version"
          autoComplete="off"
          value={draft.version}
          maxLength={120}
          disabled={!active || busy}
          placeholder="direct-onr-2026-10-v2"
          aria-invalid={!!shown("version", draft.version.length > 0)}
          onChange={(event) => set("version", event.target.value)}
        />
        {shown("version", draft.version.length > 0) && (
          <small className="sup-error" role="alert">
            {shown("version", draft.version.length > 0)}
          </small>
        )}
      </div>
      <div className="sup-field">
        <LabelRow
          htmlFor="cm-evidence"
          text="SHA-256 da evidência da tarifa PIX (se alterada)"
        >
          <MiniButton
            title="Gera o SHA-256 de um texto de declaração criado pelo painel"
            disabled={!active || busy}
            onClick={() => void onGenerateEvidence()}
          >
            Gerar
          </MiniButton>
          <FilePickButton
            disabled={!active || busy}
            onHash={onHashFile}
            onError={onEvidenceNote}
          />
        </LabelRow>
        <input
          className="input"
          id="cm-evidence"
          autoComplete="off"
          spellCheck={false}
          value={draft.payment_fee_evidence_sha256 ?? ""}
          maxLength={64}
          disabled={!active || busy}
          aria-invalid={
            !!shown(
              "evidence",
              (draft.payment_fee_evidence_sha256 ?? "").length > 0,
            )
          }
          readOnly
        />
        {shown(
          "evidence",
          (draft.payment_fee_evidence_sha256 ?? "").length > 0,
        ) ? (
          <small className="sup-error" role="alert">
            {errors.evidence}
          </small>
        ) : (
          <small>
            {feeChanged
              ? "O painel gera a declaração ao revisar, se nenhum arquivo foi escolhido."
              : "Só é exigida quando a tarifa PIX muda."}
          </small>
        )}
      </div>
      {evidenceNote && (
        <p className="sup-muted" role="status">
          {evidenceNote}
        </p>
      )}
      {declaration &&
        declaration.hash === draft.payment_fee_evidence_sha256 && (
          <DeclarationPanel
            text={declaration.text}
            fileName={`declaracao-pix-${draft.version.trim() || "versao"}.txt`}
          />
        )}
      <label>
        Motivo da publicação
        <textarea
          className="input"
          rows={3}
          maxLength={500}
          value={draft.reason}
          disabled={!active || busy}
          aria-invalid={!!shown("reason", draft.reason.length > 0)}
          onChange={(event) => set("reason", event.target.value)}
        />
        {shown("reason", draft.reason.length > 0) ? (
          <small className="sup-error" role="alert">
            {errors.reason}
          </small>
        ) : (
          <small>
            O orçamento de IA e o vencimento vêm da oferta vigente. Confira a
            tarifa PIX real antes de alterá-la.
          </small>
        )}
      </label>
    </ComposerSection>
  );
}
