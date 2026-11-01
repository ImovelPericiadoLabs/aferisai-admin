import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  listRegistryCommercialTerms,
  publishRegistryCommercialTerms,
  type RegistryCommercialTerms as Terms,
  type RegistryCommercialTermsCreate,
} from "./api";
import { stepStates } from "./account-model";
import { declarationText, nextVersionId, sha256Hex } from "./evidence-model";
import {
  COMMERCIAL_LIMITS,
  commercialErrors,
  resolveCommercialLimits,
  type CommercialLimits,
  type CommercialValues,
} from "./commercial-form-model";
import { RegistryCommercialTermsCard } from "./RegistryCommercialTermsCard";
import { RegistryCommercialTermsComposer } from "./RegistryCommercialTermsComposer";
import {
  analysisBudgetPerDocumentCents,
  commercialFields as fields,
  displayNumber,
  draftFrom,
  economicAnalysisCallSuggestion,
  numericKeys,
  parseCommercialNumber,
  type NumericKey,
} from "./registry-commercial-terms-model";
import type { ToastKind } from "./useToast";

export {
  analysisBudgetPerDocumentCents,
  economicAnalysisCallSuggestion,
  parseCommercialNumber,
} from "./registry-commercial-terms-model";

export function RegistryCommercialTerms({
  accountId,
  active,
  csrf,
  onUnauthorized,
  onToast,
}: {
  accountId: string;
  active: boolean;
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [effective, setEffective] = useState<Terms | null>(null);
  const [history, setHistory] = useState<Terms[]>([]);
  const [limits, setLimits] = useState<CommercialLimits>(COMMERCIAL_LIMITS);
  const [cursor, setCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState<RegistryCommercialTermsCreate | null>(
    null,
  );
  const [numericInputs, setNumericInputs] = useState<Record<
    NumericKey,
    string
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [declaration, setDeclaration] = useState<{
    text: string;
    hash: string;
  } | null>(null);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const feeChanged =
    !!draft &&
    !!effective &&
    (draft.payment_fee_cents !== effective.payment_fee_cents ||
      draft.payment_fee_rate_bps !== effective.payment_fee_rate_bps);
  const inputsMatch =
    !!draft &&
    !!numericInputs &&
    fields.every(
      ({ key }) => parseCommercialNumber(numericInputs[key]) === draft[key],
    );
  const errors = draft
    ? commercialErrors(
        {
          values: draft as CommercialValues,
          inputsMatch,
          version: draft.version,
          reason: draft.reason,
          evidence: draft.payment_fee_evidence_sha256 ?? "",
          feeChanged,
        },
        limits,
      )
    : {};
  const valuesBad = !!errors.values || fields.some(({ key }) => errors[key]);
  const identityBad = !!(errors.version || errors.reason || errors.evidence);
  const termStates = stepStates([!valuesBad, !identityBad, reviewing]);
  const analysisBudgetCents =
    draft && effective
      ? analysisBudgetPerDocumentCents(
          effective.analysis_planned_calls,
          draft.analysis_call_reserve_cents,
        )
      : 0;
  const economicAnalysisReserve = draft
    ? economicAnalysisCallSuggestion(
        draft.analysis_call_reserve_cents,
        limits.analysis_call_reserve_cents.min,
      )
    : null;
  /** Typed-in problems show at once; the untouched ones wait for a first attempt. */
  const shown = (key: keyof typeof errors, typed: boolean) =>
    errors[key] && (attempted || typed) ? errors[key] : undefined;

  const load = useCallback(
    async (next?: string) => {
      setLoading(true);
      try {
        const page = await listRegistryCommercialTerms(accountId, next);
        setEffective(page.effective);
        setLimits(resolveCommercialLimits(page.limits));
        setHistory((old) => (next ? [...old, ...page.items] : page.items));
        setCursor(page.next_cursor);
        if (!next) {
          setDraft(page.effective ? draftFrom(page.effective) : null);
          setNumericInputs(
            page.effective
              ? (Object.fromEntries(
                  numericKeys.map((key) => [
                    key,
                    displayNumber(page.effective![key]),
                  ]),
                ) as Record<NumericKey, string>)
              : null,
          );
        }
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar as condições.",
          );
      } finally {
        setLoading(false);
      }
    },
    [accountId, onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  function set<K extends keyof RegistryCommercialTermsCreate>(
    key: K,
    value: RegistryCommercialTermsCreate[K],
  ) {
    setReviewing(false);
    setDraft((current) => (current ? { ...current, [key]: value } : null));
  }

  function setNumeric(key: NumericKey, value: string) {
    setNumericInputs((current) =>
      current ? { ...current, [key]: value } : null,
    );
    const parsed = parseCommercialNumber(value);
    if (parsed !== null) set(key, parsed);
    else setReviewing(false);
  }

  function suggestVersion() {
    if (!effective) return;
    set(
      "version",
      nextVersionId(
        effective.version,
        history.map((item) => item.version),
        new Date(),
      ),
    );
  }

  async function generateEvidence() {
    if (!draft || !effective) return null;
    if (!draft.version.trim() || !draft.reason.trim()) {
      setEvidenceNote(
        "Preencha o identificador e o motivo antes: eles entram no texto que será assinado pelo SHA-256.",
      );
      return null;
    }
    const text = declarationText({
      version: draft.version.trim(),
      previousVersion: effective.version,
      previousFeeCents: effective.payment_fee_cents,
      nextFeeCents: draft.payment_fee_cents,
      previousRateBps: effective.payment_fee_rate_bps,
      nextRateBps: draft.payment_fee_rate_bps,
      reason: draft.reason,
      generatedAt: new Date().toISOString(),
    });
    const hash = await sha256Hex(text);
    setDeclaration({ text, hash });
    setEvidenceNote("");
    set("payment_fee_evidence_sha256", hash);
    return hash;
  }

  async function hashFile(bytes: ArrayBuffer, name: string) {
    const hash = await sha256Hex(bytes);
    setDeclaration(null);
    setEvidenceNote(
      `SHA-256 calculado aqui no navegador para “${name}”. O arquivo não foi enviado.`,
    );
    set("payment_fee_evidence_sha256", hash);
  }

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !effective || !active) return;
    setAttempted(true);
    const evidence =
      feeChanged && !draft.payment_fee_evidence_sha256
        ? await generateEvidence()
        : draft.payment_fee_evidence_sha256;
    const reviewErrors = commercialErrors(
      {
        values: draft as CommercialValues,
        inputsMatch,
        version: draft.version,
        reason: draft.reason,
        evidence: evidence ?? "",
        feeChanged,
      },
      limits,
    );
    if (Object.keys(reviewErrors).length > 0) return;
    setError("");
    setReviewing(true);
  }

  async function publish() {
    if (!draft || !reviewing || busy) return;
    setBusy(true);
    try {
      await publishRegistryCommercialTerms(
        accountId,
        {
          ...draft,
          reason: draft.reason.trim(),
          payment_fee_evidence_sha256:
            draft.payment_fee_evidence_sha256 || null,
        },
        csrf,
      );
      setReviewing(false);
      setFormOpen(false);
      onToast("Nova versão comercial publicada para esta conta.", "success");
      await load();
    } catch (cause) {
      setReviewing(false);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Publicação não confirmada. Atualize antes de tentar de novo.",
        );
        if (cause instanceof ApiError && cause.status === 409) await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <RegistryCommercialTermsCard
        effective={effective}
        history={history}
        cursor={cursor}
        loading={loading}
        busy={busy}
        error={error}
        formOpen={formOpen}
        active={active}
        draft={draft}
        numericInputs={numericInputs}
        historyOpen={historyOpen}
        onHistoryOpenChange={setHistoryOpen}
        onReload={(next) => void load(next)}
        onNewVersion={() => {
          setAttempted(false);
          setFormOpen(true);
        }}
      />

      {formOpen && draft && effective && numericInputs && (
        <RegistryCommercialTermsComposer
          termStates={termStates}
          draft={draft}
          effective={effective}
          numericInputs={numericInputs}
          limits={limits}
          errors={errors}
          shown={shown}
          active={active}
          busy={busy}
          reviewing={reviewing}
          attempted={attempted}
          error={error}
          feeChanged={feeChanged}
          evidenceNote={evidenceNote}
          declaration={declaration}
          analysisBudgetCents={analysisBudgetCents}
          economicAnalysisReserve={economicAnalysisReserve}
          set={set}
          onClose={() => !busy && setFormOpen(false)}
          onPublish={() => void publish()}
          onCancelReview={() => setReviewing(false)}
          onSubmit={review}
          onNumericChange={setNumeric}
          onSuggestVersion={suggestVersion}
          onGenerateEvidence={generateEvidence}
          onHashFile={hashFile}
          onEvidenceNote={setEvidenceNote}
        />
      )}
    </>
  );
}
