import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ApiError,
  listRegistryVisualizationTariffs,
  publishRegistryVisualizationTariff,
  type RegistrySupplierAccount,
  type RegistryVisualizationTariff,
} from "./api";
import {
  emptyTariffDraft,
  tariffDraftBody,
  type TariffDraft,
} from "./registry-tariff-model";
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

function tariffStatus(item: RegistryVisualizationTariff) {
  return new Date(item.valid_until).getTime() > Date.now()
    ? `Vigente até ${dateTime.format(new Date(item.valid_until))}`
    : `Vencida em ${dateTime.format(new Date(item.valid_until))}`;
}

export function RegistryVisualizationTariffs({
  accounts,
  csrf,
  onUnauthorized,
  onToast,
}: {
  accounts: RegistrySupplierAccount[];
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [tariffs, setTariffs] = useState<RegistryVisualizationTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TariffDraft>(emptyTariffDraft);
  const [reviewing, setReviewing] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const activeOnr = accounts.filter(
    (item) => item.provider === "onr" && item.status === "active",
  );
  const activeInfo = accounts.filter(
    (item) => item.provider === "infosimples" && item.status === "active",
  );
  const body = tariffDraftBody(draft);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listRegistryVisualizationTariffs();
      setTariffs(page.items);
      setError("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível consultar as tarifas. Tente novamente.",
        );
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (reviewing) confirmRef.current?.focus();
  }, [reviewing]);

  const set = <K extends keyof TariffDraft>(key: K, value: TariffDraft[K]) => {
    setReviewing(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body) {
      setError(
        "Confira as contas, os valores, o SHA-256, o motivo e as duas declarações.",
      );
      return;
    }
    setError("");
    setReviewing(true);
  }

  async function publish() {
    if (!body || !reviewing || busy) return;
    setBusy(true);
    try {
      const item = await publishRegistryVisualizationTariff(body, csrf);
      setReviewing(false);
      setDraft(emptyTariffDraft);
      setTariffs((current) => [item, ...current].slice(0, 20));
      setError("");
      onToast("Tarifa de visualização publicada por 72 horas.", "success");
    } catch (cause) {
      setReviewing(false);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else {
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "A publicação não foi confirmada. Atualize a lista antes de tentar de novo.",
        );
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  const accountLabel = (id: string) =>
    accounts.find((item) => item.id === id)?.label ?? id.slice(0, 8);

  return (
    <section className="vm-tariff" aria-labelledby="vm-tariff-title">
      <div className="vm-tariff-heading">
        <div>
          <h2 id="vm-tariff-title">Tarifa da visualização</h2>
          <p>
            Registre o custo da API InfoSimples para um pedido e até três
            downloads. O preço do RI Digital é verificado separadamente em cada
            prévia.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={loading || busy}
          onClick={() => void load()}
        >
          Atualizar tarifas
        </button>
      </div>

      {loading ? (
        <p role="status">Carregando tarifas…</p>
      ) : tariffs.length ? (
        <div className="vm-tariff-current" aria-label="Última tarifa publicada">
          <strong>Última versão · {tariffStatus(tariffs[0])}</strong>
          <span>
            {accountLabel(tariffs[0].onr_account_id)} +{" "}
            {accountLabel(tariffs[0].infosimples_account_id)}
          </span>
          <span>
            Pedido {money(tariffs[0].order_fee_cents)} · download{" "}
            {money(tariffs[0].download_fee_cents)} ×{" "}
            {tariffs[0].download_budget_count} · mínimo mensal{" "}
            {money(tariffs[0].monthly_minimum_reserve_cents)}
          </span>
          <strong>Reserva da API {money(tariffs[0].budget_cents)}</strong>
        </div>
      ) : (
        <p role="status">
          Nenhuma tarifa publicada. A visualização permanece sem custo API
          vigente.
        </p>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <form className="vm-tariff-form" onSubmit={review} noValidate>
        <div className="vm-tariff-fields">
          <label>
            Conta RI Digital ativa
            <select
              className="input"
              value={draft.onrAccountId}
              onChange={(event) => set("onrAccountId", event.target.value)}
              disabled={busy}
              required
            >
              <option value="">Selecione a conta</option>
              {activeOnr.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Conta InfoSimples ativa
            <select
              className="input"
              value={draft.infosimplesAccountId}
              onChange={(event) =>
                set("infosimplesAccountId", event.target.value)
              }
              disabled={busy}
              required
            >
              <option value="">Selecione a conta</option>
              {activeInfo.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pedido de visualização (R$)
            <input
              className="input"
              inputMode="decimal"
              value={draft.orderFee}
              placeholder="0,28"
              onChange={(event) => set("orderFee", event.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label>
            Cada download (R$)
            <input
              className="input"
              inputMode="decimal"
              value={draft.downloadFee}
              placeholder="0,20"
              onChange={(event) => set("downloadFee", event.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label>
            Parcela do mínimo mensal por venda (R$)
            <input
              className="input"
              inputMode="decimal"
              value={draft.monthlyReserve}
              onChange={(event) => set("monthlyReserve", event.target.value)}
              disabled={busy}
              required
            />
            <small>Lucas aprovou R$ 0,00 como custo fixo da operação.</small>
          </label>
          <label>
            SHA-256 da evidência privada
            <input
              className="input"
              value={draft.evidenceSha256}
              maxLength={64}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => set("evidenceSha256", event.target.value)}
              disabled={busy}
              required
            />
            <small>
              Guarde a evidência fora do repositório, sem credenciais ou
              matrículas.
            </small>
          </label>
        </div>
        <label>
          Motivo da conferência
          <textarea
            className="input"
            rows={3}
            minLength={10}
            maxLength={500}
            value={draft.reason}
            onChange={(event) => set("reason", event.target.value)}
            disabled={busy}
            required
          />
          <small>
            Fica na auditoria. Não inclua senhas, tokens ou dados de matrícula.
          </small>
        </label>
        <label className="vm-tariff-check">
          <input
            type="checkbox"
            checked={draft.contractVerified}
            onChange={(event) => set("contractVerified", event.target.checked)}
            disabled={busy}
          />
          Conferi o uso das APIs de pedido e download nesta conta.
        </label>
        <label className="vm-tariff-check">
          <input
            type="checkbox"
            checked={draft.supplierFeeCovered}
            onChange={(event) =>
              set("supplierFeeCovered", event.target.checked)
            }
            disabled={busy}
          />
          Os valores informados cobrem o pedido, três downloads e a parcela
          mensal declarada.
        </label>
        {body && (
          <p className="vm-tariff-total" aria-live="polite">
            Reserva da API:{" "}
            <strong>
              {money(
                body.order_fee_cents +
                  3 * body.download_fee_cents +
                  body.monthly_minimum_reserve_cents,
              )}
            </strong>
          </p>
        )}
        {!reviewing ? (
          <button
            type="submit"
            className="btn btn-primary btn-md"
            disabled={busy || !activeOnr.length || !activeInfo.length}
          >
            Revisar publicação
          </button>
        ) : body ? (
          <div
            className="vm-tariff-review"
            role="group"
            aria-label="Confirmar tarifa"
          >
            <p>
              Confirme {accountLabel(body.onr_account_id)} e{" "}
              {accountLabel(body.infosimples_account_id)}: pedido{" "}
              {money(body.order_fee_cents)}, três downloads de{" "}
              {money(body.download_fee_cents)} e mínimo mensal{" "}
              {money(body.monthly_minimum_reserve_cents)}. A versão valerá por
              72 horas e ficará na auditoria.
            </p>
            <button
              ref={confirmRef}
              type="button"
              className="btn btn-primary btn-md"
              disabled={busy}
              onClick={() => void publish()}
            >
              {busy ? "Publicando…" : "Confirmar e publicar"}
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
        ) : null}
      </form>
    </section>
  );
}
