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
import { FormModal, Metrics, SettingCard } from "./SupplierUi";
import { useNow } from "./useNow";
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

function draftFor(account: RegistrySupplierAccount): TariffDraft {
  return {
    ...emptyTariffDraft,
    onrAccountId: account.provider === "onr" ? account.id : "",
    infosimplesAccountId: account.provider === "infosimples" ? account.id : "",
  };
}

export function RegistryVisualizationTariffs({
  account,
  accounts,
  csrf,
  onUnauthorized,
  onToast,
}: {
  account: RegistrySupplierAccount;
  accounts: RegistrySupplierAccount[];
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [tariffs, setTariffs] = useState<RegistryVisualizationTariff[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TariffDraft>(() => draftFor(account));
  const [reviewing, setReviewing] = useState(false);
  const now = useNow();
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const activeOnr = accounts.filter(
    (item) => item.provider === "onr" && item.status === "active",
  );
  const activeInfo = accounts.filter(
    (item) => item.provider === "infosimples" && item.status === "active",
  );
  const body = tariffDraftBody(draft);

  const load = useCallback(
    async (next?: string | null) => {
      setLoading(true);
      try {
        const page = await listRegistryVisualizationTariffs(account.id, next);
        setTariffs((current) =>
          next ? [...current, ...page.items] : page.items,
        );
        setCursor(page.next_cursor);
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
    },
    [account.id, onUnauthorized],
  );

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
      setFormOpen(false);
      setDraft(draftFor(account));
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

  const current = tariffs[0];

  return (
    <>
      <SettingCard
        title="Tarifa da visualização"
        help={
          <>
            A InfoSimples cobra o pedido e até três downloads; o preço do RI
            Digital é verificado em cada prévia. Cada versão vale 72 horas e
            fica na auditoria.
          </>
        }
        badge={
          current && (
            <span
              className={`badge badge-${new Date(current.valid_until).getTime() > now ? "success" : "warning"}`}
            >
              {tariffStatus(current)}
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
            {tariffs.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setHistoryOpen(true)}
              >
                Histórico ({tariffs.length})
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-md"
              aria-haspopup="dialog"
              disabled={account.status !== "active"}
              title={
                account.status !== "active"
                  ? "Ative a conta para publicar uma tarifa."
                  : undefined
              }
              onClick={() => setFormOpen(true)}
            >
              Nova tarifa
            </button>
          </>
        }
      >
        {error && !formOpen && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {loading && !current ? (
          <p role="status" className="sup-muted">
            Carregando tarifas…
          </p>
        ) : current ? (
          <>
            <Metrics
              items={[
                { label: "Pedido", value: money(current.order_fee_cents) },
                {
                  label: `Download × ${current.download_budget_count}`,
                  value: money(current.download_fee_cents),
                },
                {
                  label: "Mínimo mensal",
                  value: money(current.monthly_minimum_reserve_cents),
                },
                {
                  label: "Reserva da API",
                  value: <strong>{money(current.budget_cents)}</strong>,
                },
              ]}
            />
            <p className="sup-muted sup-clip">
              {accountLabel(current.onr_account_id)} +{" "}
              {accountLabel(current.infosimples_account_id)}
            </p>
          </>
        ) : (
          <p role="status" className="sup-muted">
            Nenhuma tarifa publicada. A visualização segue sem custo de API
            vigente.
          </p>
        )}
      </SettingCard>

      <FormModal
        open={historyOpen}
        title="Histórico de tarifas"
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
          {tariffs.map((item) => (
            <li key={item.id}>
              <strong>{money(item.budget_cents)}</strong>
              <span>{tariffStatus(item)}</span>
              <small className="sup-clip">
                {accountLabel(item.onr_account_id)} +{" "}
                {accountLabel(item.infosimples_account_id)}
              </small>
            </li>
          ))}
        </ol>
      </FormModal>

      <FormModal
        open={formOpen}
        title="Nova tarifa de visualização"
        onClose={() => !busy && setFormOpen(false)}
      >
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <form className="sup-form-grid" onSubmit={review} noValidate>
          <div className="vm-tariff-fields">
            {account.provider !== "onr" && (
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
            )}
            {account.provider !== "infosimples" && (
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
            )}
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
              Mínimo mensal por venda (R$)
              <input
                className="input"
                inputMode="decimal"
                value={draft.monthlyReserve}
                onChange={(event) => set("monthlyReserve", event.target.value)}
                disabled={busy}
                required
              />
              <small>Custo fixo da operação aprovado pelo responsável.</small>
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
              <small>Evidência guardada fora do repositório.</small>
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
            <small>Fica na auditoria. Sem senhas, tokens ou matrículas.</small>
          </label>
          <label className="vm-tariff-check">
            <input
              type="checkbox"
              checked={draft.contractVerified}
              onChange={(event) =>
                set("contractVerified", event.target.checked)
              }
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
            Os valores cobrem o pedido, três downloads e o mínimo mensal.
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
      </FormModal>
    </>
  );
}
