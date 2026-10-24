import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  listRegistryCommercialTerms,
  publishRegistryCommercialTerms,
  type RegistryCommercialTerms as Terms,
  type RegistryCommercialTermsCreate,
} from "./api";
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
    unit: "% (mínimo 50%)",
  },
  {
    key: "markup_bps",
    label: "Acréscimo público sobre o custo total",
    unit: "% (mínimo 50%)",
  },
  {
    key: "tax_rate_bps",
    label: "Reserva tributária",
    unit: "% (atual: 15,5%)",
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
  const [error, setError] = useState("");

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
    const feeChanged =
      draft.payment_fee_cents !== effective.payment_fee_cents ||
      draft.payment_fee_rate_bps !== effective.payment_fee_rate_bps;
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/.test(draft.version) ||
      draft.reason.trim().length < 10 ||
      fields.some(
        ({ key }) =>
          !numericInputs ||
          parseCommercialNumber(numericInputs[key]) !== draft[key] ||
          !Number.isSafeInteger(draft[key]) ||
          draft[key] < 0,
      ) ||
      draft.markup_bps < 5000 ||
      draft.onr_markup_bps < 5000 ||
      draft.payment_fee_cents <= 0 ||
      draft.payment_fee_rate_bps + draft.tax_rate_bps >= 10000 ||
      (feeChanged &&
        !/^[0-9a-f]{64}$/.test(draft.payment_fee_evidence_sha256 ?? ""))
    ) {
      setError(
        "Confira a versão, o motivo, os valores e a evidência da tarifa PIX quando ela mudar.",
      );
      return;
    }
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
    <section className="sup-commercial" aria-labelledby="sup-commercial-title">
      <div className="sup-commercial-heading">
        <div>
          <h3 id="sup-commercial-title">Condições da cotação</h3>
          <p className="form-hint">
            Cada publicação vale para novas cotações desta conta. Preços já
            cotados conservam sua versão.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={loading || busy}
          onClick={() => void load()}
        >
          Atualizar
        </button>
      </div>
      {loading && <p role="status">Carregando condições…</p>}
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {!loading && effective && (
        <div className="sup-commercial-current">
          <strong>{effective.version}</strong>
          <span>
            Vigente até {dateTime.format(new Date(effective.valid_until))}
          </span>
          <span>
            IA reservada por documento:{" "}
            {money(effective.analysis_reserve_cents)}
          </span>
          <span>
            ONR: {(effective.onr_markup_bps / 100).toLocaleString("pt-BR")}% ·
            tributos: {(effective.tax_rate_bps / 100).toLocaleString("pt-BR")}%
            · PIX: {money(effective.payment_fee_cents)}
          </span>
          {effective.onr_account_id === null && (
            <small>
              Versão geral anterior; publique uma versão desta conta para
              personalizar.
            </small>
          )}
        </div>
      )}
      {!loading && !effective && (
        <p className="form-hint">
          Sem oferta completa vigente. Publique primeiro o orçamento de IA e
          tarifa no backend.
        </p>
      )}
      {draft && effective && numericInputs && (
        <form className="sup-commercial-form" onSubmit={review} noValidate>
          <h4>Nova versão</h4>
          <p className="form-hint">
            O orçamento de IA e o vencimento vêm da oferta vigente. Confira a
            tarifa PIX real antes de alterá-la.
          </p>
          <div className="sup-commercial-fields">
            {fields.map(({ key, label, unit }) => (
              <label key={key}>
                {label} ({unit})
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  value={numericInputs[key]}
                  disabled={!active || busy}
                  onChange={(event) => setNumeric(key, event.target.value)}
                />
                <small>
                  {key.endsWith("bps")
                    ? "Percentual da nova versão"
                    : "Valor da nova versão"}
                </small>
              </label>
            ))}
          </div>
          <label>
            Identificador da nova versão
            <input
              className="input"
              value={draft.version}
              maxLength={120}
              disabled={!active || busy}
              placeholder="direct-onr-2026-10-v2"
              onChange={(event) => set("version", event.target.value)}
            />
          </label>
          <label>
            SHA-256 da evidência da tarifa PIX (se alterada)
            <input
              className="input"
              value={draft.payment_fee_evidence_sha256 ?? ""}
              maxLength={64}
              disabled={!active || busy}
              onChange={(event) =>
                set("payment_fee_evidence_sha256", event.target.value || null)
              }
            />
          </label>
          <label>
            Motivo da publicação
            <textarea
              className="input"
              rows={3}
              maxLength={500}
              value={draft.reason}
              disabled={!active || busy}
              onChange={(event) => set("reason", event.target.value)}
            />
          </label>
          {!active && (
            <p className="form-hint">
              Ative a conta para publicar uma nova versão.
            </p>
          )}
          {reviewing ? (
            <div
              className="sup-commercial-review"
              role="group"
              aria-label="Confirmar versão comercial"
            >
              <strong>Confira antes de publicar</strong>
              <span>
                ONR {(draft.onr_markup_bps / 100).toLocaleString("pt-BR")}% ·
                tributos {(draft.tax_rate_bps / 100).toLocaleString("pt-BR")}% ·
                PIX {money(draft.payment_fee_cents)}
              </span>
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
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => setReviewing(false)}
              >
                Voltar
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={!active || busy}
            >
              Revisar publicação
            </button>
          )}
        </form>
      )}
      {history.length > 0 && (
        <details className="sup-commercial-history">
          <summary>
            Histórico da conta ({history.length} versões carregadas)
          </summary>
          <ol>
            {history.map((item) => (
              <li key={item.id}>
                {item.version} · ONR{" "}
                {(item.onr_markup_bps / 100).toLocaleString("pt-BR")}% ·
                tributos {(item.tax_rate_bps / 100).toLocaleString("pt-BR")}%
              </li>
            ))}
          </ol>
          {cursor && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={loading}
              onClick={() => void load(cursor)}
            >
              Carregar versões anteriores
            </button>
          )}
        </details>
      )}
    </section>
  );
}
