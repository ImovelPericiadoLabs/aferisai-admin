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
  COMMERCIAL_LIMITS,
  commercialErrors,
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
  | "exception_reserve_cents"
  | "payment_fee_cents"
  | "payment_fee_rate_bps"
  | "tax_rate_bps"
  | "minimum_contribution_cents"
  | "markup_bps"
  | "onr_markup_bps"
>;
const numericKeys: NumericKey[] = [
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

const fields: {
  key: NumericKey;
  label: string;
  unit: string;
}[] = [
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

/** "% · mínimo 50% · atual 6%": the limit and the current value come from data, not from copy. */
function unitHint(key: NumericKey, unit: string, current: Terms): string {
  const value = current[key];
  const shown = unit.startsWith("%")
    ? `${(value / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
    : `R$ ${displayNumber(value)}`;
  const bound =
    key === "onr_markup_bps" || key === "markup_bps"
      ? ` · mínimo ${COMMERCIAL_LIMITS.minMarkupBps / 100}%`
      : key === "tax_rate_bps" || key === "payment_fee_rate_bps"
        ? ` · máximo ${COMMERCIAL_LIMITS.maxRateBps / 100}%`
        : "";
  return `${unit}${bound} · atual ${shown}`;
}

function draftFrom(terms: Terms): RegistryCommercialTermsCreate {
  return {
    base_offer_id: terms.id,
    version: "",
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
    ? commercialErrors({
        values: draft as CommercialValues,
        inputsMatch,
        version: draft.version,
        reason: draft.reason,
        evidence: draft.payment_fee_evidence_sha256 ?? "",
        feeChanged,
      })
    : {};
  const valuesBad = !!errors.values || fields.some(({ key }) => errors[key]);
  const identityBad = !!(errors.version || errors.reason || errors.evidence);
  const termStates = stepStates([!valuesBad, !identityBad, reviewing]);
  /** Typed-in problems show at once; the untouched ones wait for a first attempt. */
  const shown = (key: keyof typeof errors, typed: boolean) =>
    errors[key] && (attempted || typed) ? errors[key] : undefined;

  const load = useCallback(
    async (next?: string) => {
      setLoading(true);
      try {
        const page = await listRegistryCommercialTerms(accountId, next);
        setEffective(page.effective);
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

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !effective || !active) return;
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
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
                  value: `${money(effective.analysis_reserve_cents)} (da oferta)`,
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
                      PIX {money(draft.payment_fee_cents)}.
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
                <label key={key}>
                  {label}{" "}
                  <span className="sup-unit">
                    {unitHint(key, unit, effective)}
                  </span>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    value={numericInputs[key]}
                    disabled={!active || busy}
                    onChange={(event) => setNumeric(key, event.target.value)}
                  />
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
                </label>
              ))}
            </ComposerSection>
            <ComposerSection
              title="Versão e evidência"
              state={termStates[1]}
              recap={`${draft.version.trim()} · ${draft.reason.trim().slice(0, 40)}`}
            >
              <label>
                Identificador da nova versão
                <input
                  className="input"
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
              </label>
              <label>
                SHA-256 da evidência da tarifa PIX (se alterada)
                <input
                  className="input"
                  value={draft.payment_fee_evidence_sha256 ?? ""}
                  maxLength={64}
                  disabled={!active || busy}
                  aria-invalid={
                    !!shown(
                      "evidence",
                      (draft.payment_fee_evidence_sha256 ?? "").length > 0,
                    )
                  }
                  onChange={(event) =>
                    set(
                      "payment_fee_evidence_sha256",
                      event.target.value || null,
                    )
                  }
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
                      ? "Obrigatório: a tarifa PIX mudou."
                      : "Só é exigida quando a tarifa PIX muda."}
                  </small>
                )}
              </label>
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
