import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  listRegistryCommercialTerms,
  publishRegistryCommercialTerms,
  type RegistryCommercialTerms as Terms,
  type RegistryCommercialTermsCreate,
} from "./api";
import {
  Composer,
  ComposerSection,
  ComposerSummary,
  Delta,
  InlinePanel,
  Metrics,
  SettingCard,
} from "./SupplierUi";
import { stepStates } from "./account-model";
import {
  DeclarationPanel,
  FilePickButton,
  LabelRow,
  MiniButton,
} from "./EvidenceTools";
import { declarationText, nextVersionId, sha256Hex } from "./evidence-model";
import {
  COMMERCIAL_LIMITS,
  commercialErrors,
  resolveCommercialLimits,
  type CommercialLimits,
  type CommercialValues,
} from "./commercial-form-model";
import type { ToastKind } from "./useToast";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type NumericKey = keyof Pick<
  RegistryCommercialTermsCreate,
  | "operations_reserve_cents"
  | "analysis_call_reserve_cents"
  | "exception_reserve_cents"
  | "payment_fee_cents"
  | "payment_fee_rate_bps"
  | "tax_rate_bps"
  | "minimum_contribution_cents"
  | "markup_bps"
  | "onr_markup_bps"
>;
const numericKeys: NumericKey[] = [
  "analysis_call_reserve_cents",
  "operations_reserve_cents",
  "exception_reserve_cents",
  "payment_fee_cents",
  "payment_fee_rate_bps",
  "tax_rate_bps",
  "minimum_contribution_cents",
  "markup_bps",
  "onr_markup_bps",
];
function displayNumber(value: number): string {
  return (value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
export function parseCommercialNumber(value: string): number | null {
  const trimmed = value.trim();
  const normalized = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(trimmed)
    ? trimmed.replaceAll(".", "").replace(",", ".")
    : trimmed.replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const scaled = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(scaled) ? scaled : null;
}

/** Calculates the per-document AI reserve from the planned calls and reserve per call. */
export function analysisBudgetPerDocumentCents(
  plannedCalls: number,
  callReserveCents: number,
): number {
  return Number.isSafeInteger(plannedCalls) &&
    Number.isSafeInteger(callReserveCents)
    ? Math.max(1000, plannedCalls * callReserveCents)
    : 0;
}

/** Returns the lowest server-allowed reserve when it is cheaper than the current one. */
export function economicAnalysisCallSuggestion(
  currentCents: number,
  minimumCents: number,
): number | null {
  if (
    !Number.isSafeInteger(currentCents) ||
    !Number.isSafeInteger(minimumCents)
  )
    return null;
  return currentCents > minimumCents ? minimumCents : null;
}

const fields: {
  key: NumericKey;
  label: string;
  unit: string;
}[] = [
  {
    key: "analysis_call_reserve_cents",
    label: "Reserva de IA por chamada",
    unit: "R$ por chamada planejada",
  },
  {
    key: "onr_markup_bps",
    label: "Acréscimo sobre a matrícula ONR",
    unit: "%",
  },
  {
    key: "markup_bps",
    label: "Acréscimo público sobre o custo total",
    unit: "%",
  },
  {
    key: "tax_rate_bps",
    label: "Reserva tributária",
    unit: "%",
  },
  { key: "payment_fee_cents", label: "Tarifa fixa PIX", unit: "R$" },
  {
    key: "payment_fee_rate_bps",
    label: "Tarifa percentual PIX",
    unit: "%",
  },
  {
    key: "operations_reserve_cents",
    label: "Reserva operacional",
    unit: "R$ por pedido",
  },
  {
    key: "exception_reserve_cents",
    label: "Reserva de exceção",
    unit: "R$ por pedido",
  },
  {
    key: "minimum_contribution_cents",
    label: "Contribuição mínima",
    unit: "R$",
  },
];

/** Show the current value and server-published field bounds. */
function unitHint(
  key: NumericKey,
  unit: string,
  current: Terms,
  limits: CommercialLimits,
): string {
  const value = current[key];
  const shown = unit.startsWith("%")
    ? `${(value / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
    : `R$ ${displayNumber(value)}`;
  const floor = limits[key].min;
  const ceiling = limits[key].max;
  const show = (amount: number) =>
    unit.startsWith("%")
      ? `${(amount / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
      : money(amount);
  const bound = ` · mínimo ${show(floor)} · máximo ${show(ceiling)}`;
  return `${unit}${bound} · atual ${shown}`;
}

function draftFrom(terms: Terms): RegistryCommercialTermsCreate {
  return {
    base_offer_id: terms.id,
    version: "",
    analysis_call_reserve_cents: terms.analysis_call_reserve_cents,
    operations_reserve_cents: terms.operations_reserve_cents,
    exception_reserve_cents: terms.exception_reserve_cents,
    payment_fee_cents: terms.payment_fee_cents,
    payment_fee_rate_bps: terms.payment_fee_rate_bps,
    tax_rate_bps: terms.tax_rate_bps,
    minimum_contribution_cents: terms.minimum_contribution_cents,
    markup_bps: terms.markup_bps,
    onr_markup_bps: terms.onr_markup_bps,
    payment_fee_evidence_sha256: null,
    reason: "",
  };
}

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
      <SettingCard
        title="Condições da cotação"
        help="Cada publicação vale para novas cotações desta conta. Preços já cotados conservam a versão em que nasceram."
        badge={
          effective && (
            <span className="badge badge-success">
              Vigente até {dateTime.format(new Date(effective.valid_until))}
            </span>
          )
        }
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-md"
              disabled={loading || busy}
              onClick={() => void load()}
            >
              Atualizar
            </button>
            {history.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setHistoryOpen(true)}
              >
                Histórico ({history.length})
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-md"
              aria-haspopup="dialog"
              disabled={!active || !draft || !effective || !numericInputs}
              title={!active ? "Ative a conta para publicar." : undefined}
              onClick={() => {
                setAttempted(false);
                setFormOpen(true);
              }}
            >
              Nova versão
            </button>
          </>
        }
      >
        {loading && (
          <p role="status" className="sup-muted">
            Carregando condições…
          </p>
        )}
        {error && !formOpen && (
          <p className="alert alert-danger" role="alert">
            {error}
          </p>
        )}
        {!loading && effective && (
          <>
            <Metrics
              items={[
                {
                  label: "IA por documento",
                  value: money(effective.analysis_reserve_cents),
                },
                {
                  label: "Margem ONR",
                  value: `${(effective.onr_markup_bps / 100).toLocaleString("pt-BR")}%`,
                },
                {
                  label: "Tributos",
                  value: `${(effective.tax_rate_bps / 100).toLocaleString("pt-BR")}%`,
                },
                {
                  label: "Tarifa PIX",
                  value: money(effective.payment_fee_cents),
                },
              ]}
            />
            <p className="sup-muted sup-clip">
              Versão <code>{effective.version}</code>
              {effective.onr_account_id === null &&
                " · geral anterior; publique uma desta conta para personalizar"}
            </p>
            <div
              className="sup-analysis-availability"
              aria-label="Disponibilidade da IA por documento"
            >
              <div>
                <strong>
                  {effective.analysis_planned_calls > 0
                    ? "IA disponível"
                    : "IA indisponível"}
                </strong>
                <span>
                  {effective.analysis_planned_calls > 0
                    ? `${effective.analysis_planned_calls} chamadas planejadas por documento`
                    : "O orçamento de IA não está completo"}
                </span>
              </div>
              <div>
                <strong>Como é calculado</strong>
                <span>
                  {effective.analysis_planned_calls} chamadas ×{" "}
                  {money(effective.analysis_call_reserve_cents)} ={" "}
                  {money(effective.analysis_reserve_cents)} por documento
                </span>
              </div>
            </div>
          </>
        )}
        {!loading && !effective && (
          <p className="sup-muted">
            Sem oferta completa vigente. Publique antes o orçamento de IA e a
            tarifa no backend.
          </p>
        )}
      </SettingCard>

      <InlinePanel
        open={historyOpen}
        title="Histórico da conta"
        onClose={() => setHistoryOpen(false)}
        footer={
          cursor ? (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={loading}
              onClick={() => void load(cursor)}
            >
              Carregar versões anteriores
            </button>
          ) : undefined
        }
      >
        <ol className="sup-history">
          {history.map((item) => (
            <li key={item.id}>
              <strong className="sup-clip">{item.version}</strong>
              <span>
                ONR {(item.onr_markup_bps / 100).toLocaleString("pt-BR")}% ·
                tributos {(item.tax_rate_bps / 100).toLocaleString("pt-BR")}%
              </span>
            </li>
          ))}
        </ol>
      </InlinePanel>

      {formOpen && draft && effective && numericInputs && (
        <Composer
          title="Nova versão comercial"
          steps={[
            { id: "values", label: "Valores", state: termStates[0] },
            {
              id: "identity",
              label: "Versão e evidência",
              state: termStates[1],
            },
            { id: "review", label: "Revisão", state: termStates[2] },
          ]}
          onClose={() => !busy && setFormOpen(false)}
          summary={
            <ComposerSummary
              title="Resumo da nova versão"
              rows={[
                {
                  label: "Margem ONR",
                  value: (
                    <>
                      {(draft.onr_markup_bps / 100).toLocaleString("pt-BR")}%{" "}
                      <Delta
                        current={draft.onr_markup_bps}
                        previous={effective.onr_markup_bps}
                      />
                    </>
                  ),
                },
                {
                  label: "Tributos",
                  value: (
                    <>
                      {(draft.tax_rate_bps / 100).toLocaleString("pt-BR")}%{" "}
                      <Delta
                        current={draft.tax_rate_bps}
                        previous={effective.tax_rate_bps}
                      />
                    </>
                  ),
                },
                {
                  label: "Tarifa PIX",
                  value: (
                    <>
                      {money(draft.payment_fee_cents)}{" "}
                      <Delta
                        current={draft.payment_fee_cents}
                        previous={effective.payment_fee_cents}
                      />
                    </>
                  ),
                },
                {
                  label: "Contribuição mínima",
                  value: money(draft.minimum_contribution_cents),
                },
                {
                  label: "Reserva de IA",
                  value: `${money(analysisBudgetCents)} por documento (${effective.analysis_planned_calls} chamadas)`,
                },
                { label: "Versão", value: draft.version.trim() || "—" },
              ]}
              footer={
                reviewing ? (
                  <div
                    className="sup-review"
                    role="group"
                    aria-label="Confirmar versão comercial"
                  >
                    <p>
                      Publicar <strong>{draft.version.trim()}</strong>: ONR{" "}
                      {(draft.onr_markup_bps / 100).toLocaleString("pt-BR")}% ·
                      tributos{" "}
                      {(draft.tax_rate_bps / 100).toLocaleString("pt-BR")}% ·
                      PIX {money(draft.payment_fee_cents)} · IA{" "}
                      {money(analysisBudgetCents)} por documento.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-md"
                      disabled={busy}
                      onClick={() => void publish()}
                    >
                      {busy ? "Publicando…" : "Confirmar publicação"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-md"
                      disabled={busy}
                      onClick={() => setReviewing(false)}
                    >
                      Voltar
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    form="commercial-form"
                    className="btn btn-primary btn-md"
                    disabled={!active || busy}
                  >
                    Revisar publicação
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
          {attempted && Object.keys(errors).length > 0 && (
            <p className="alert alert-danger" role="alert">
              Há {Object.keys(errors).length}{" "}
              {Object.keys(errors).length === 1 ? "campo" : "campos"} para
              corrigir, destacados abaixo.
            </p>
          )}
          <form
            id="commercial-form"
            className="sup-composer-form"
            onSubmit={review}
            noValidate
          >
            <ComposerSection
              title="Valores"
              state={termStates[0]}
              recap={`ONR ${(draft.onr_markup_bps / 100).toLocaleString("pt-BR")}% · tributos ${(draft.tax_rate_bps / 100).toLocaleString("pt-BR")}% · PIX ${money(draft.payment_fee_cents)}`}
            >
              {shown("values", true) && (
                <p className="sup-error sup-span" role="alert">
                  {errors.values}
                </p>
              )}
              {fields.map(({ key, label, unit }) => (
                <div key={key} className="sup-field">
                  <label htmlFor={`cm-${key}`}>
                    {label}{" "}
                    <span className="sup-unit">
                      {unitHint(key, unit, effective, limits)}
                    </span>
                  </label>
                  <input
                    className="input"
                    id={`cm-${key}`}
                    type="text"
                    inputMode="decimal"
                    value={numericInputs[key]}
                    disabled={!active || busy}
                    onChange={(event) => setNumeric(key, event.target.value)}
                  />
                  {key === "analysis_call_reserve_cents" && (
                    <div className="sup-analysis-field-note">
                      <span>
                        {effective.analysis_planned_calls} chamadas planejadas
                        por documento · total atual {money(analysisBudgetCents)}
                        .
                      </span>
                      {economicAnalysisReserve !== null ? (
                        <button
                          type="button"
                          className="sup-mini"
                          disabled={!active || busy}
                          onClick={() =>
                            setNumeric(
                              key,
                              displayNumber(economicAnalysisReserve),
                            )
                          }
                        >
                          Sugerir {money(economicAnalysisReserve)}/chamada
                        </button>
                      ) : (
                        <span>
                          Já está no menor valor permitido pelo backend.
                        </span>
                      )}
                    </div>
                  )}
                  {shown(key, true) ? (
                    <small className="sup-error" role="alert">
                      {shown(key, true)}
                    </small>
                  ) : (
                    <small>
                      {key.endsWith("bps")
                        ? "Percentual da nova versão"
                        : "Valor da nova versão"}
                    </small>
                  )}
                </div>
              ))}
            </ComposerSection>
            <ComposerSection
              title="Versão e evidência"
              state={termStates[1]}
              recap={`${draft.version.trim()} · ${draft.reason.trim().slice(0, 40)}`}
            >
              <div className="sup-field">
                <LabelRow
                  htmlFor="cm-version"
                  text="Identificador da nova versão"
                >
                  <MiniButton
                    title="Sugere o próximo identificador a partir da versão vigente"
                    disabled={!active || busy}
                    onClick={suggestVersion}
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
                    onClick={() => void generateEvidence()}
                  >
                    Gerar
                  </MiniButton>
                  <FilePickButton
                    disabled={!active || busy}
                    onHash={hashFile}
                    onError={setEvidenceNote}
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
                    O orçamento de IA e o vencimento vêm da oferta vigente.
                    Confira a tarifa PIX real antes de alterá-la.
                  </small>
                )}
              </label>
            </ComposerSection>
          </form>
        </Composer>
      )}
    </>
  );
}
