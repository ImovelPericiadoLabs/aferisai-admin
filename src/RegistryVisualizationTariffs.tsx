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
  parseBrlCents,
  tariffComplete,
  tariffDraftBody,
  tariffProblems,
  type TariffDraft,
} from "./registry-tariff-model";
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
  supplierTariffIsCurrent,
  supplierTariffValidityLabel,
} from "./supplier-tariff-validity";
import { useNow } from "./useNow";
import type { ToastKind } from "./useToast";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

function tariffStatus(item: RegistryVisualizationTariff) {
  return supplierTariffValidityLabel(item.valid_until);
}

function draftFor(
  account: RegistrySupplierAccount,
  accounts: RegistrySupplierAccount[],
): TariffDraft {
  const only = (provider: RegistrySupplierAccount["provider"]) => {
    const active = accounts.filter(
      (item) => item.provider === provider && item.status === "active",
    );
    return active.length === 1 ? active[0].id : "";
  };
  return {
    ...emptyTariffDraft,
    onrAccountId: account.provider === "onr" ? account.id : only("onr"),
    infosimplesAccountId:
      account.provider === "infosimples" ? account.id : only("infosimples"),
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
  const [draft, setDraft] = useState<TariffDraft>(() =>
    draftFor(account, accounts),
  );
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
  const states = stepStates(tariffComplete(draft));
  const orderCents = parseBrlCents(draft.orderFee);
  const downloadCents = parseBrlCents(draft.downloadFee);
  const reserveCents = parseBrlCents(draft.monthlyReserve);

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
      setError(`Falta ou está inválido: ${tariffProblems(draft).join("; ")}.`);
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
      setDraft(draftFor(account, accounts));
      setTariffs((current) => [item, ...current].slice(0, 20));
      setError("");
      onToast(
        "Tarifa de visualização publicada até nova atualização.",
        "success",
      );
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
  const previousOf = (item: RegistryVisualizationTariff) =>
    tariffs.find((other) => other.id === item.previous_id) ?? null;

  return (
    <>
      <SettingCard
        title="Tarifa da visualização"
        help={
          <>
            A InfoSimples cobra o pedido e até três downloads; o preço do RI
            Digital é verificado em cada prévia. A tarifa fica vigente até o
            gestor publicar outra versão; ambas ficam na auditoria.
          </>
        }
        badge={
          current && (
            <span
              className={`badge badge-${supplierTariffIsCurrent(current.valid_until, now) ? "success" : "warning"}`}
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
                  value: (
                    <>
                      <strong>{money(current.budget_cents)}</strong>{" "}
                      <Delta
                        current={current.budget_cents}
                        previous={previousOf(current)?.budget_cents}
                      />
                    </>
                  ),
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

      <InlinePanel
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
              <span>
                {tariffStatus(item)}{" "}
                <Delta
                  current={item.budget_cents}
                  previous={previousOf(item)?.budget_cents}
                />
              </span>
              <small className="sup-clip">
                {accountLabel(item.onr_account_id)} +{" "}
                {accountLabel(item.infosimples_account_id)}
              </small>
            </li>
          ))}
        </ol>
      </InlinePanel>

      {formOpen && (
        <Composer
          title="Nova tarifa de visualização"
          steps={[
            { id: "values", label: "Valores", state: states[0] },
            { id: "evidence", label: "Evidência", state: states[1] },
            { id: "confirm", label: "Confirmação", state: states[2] },
          ]}
          onClose={() => !busy && setFormOpen(false)}
          summary={
            <ComposerSummary
              title="Resumo da nova versão"
              total={
                orderCents !== null && downloadCents !== null
                  ? money(orderCents + 3 * downloadCents + (reserveCents ?? 0))
                  : "—"
              }
              delta={
                orderCents !== null && downloadCents !== null && current ? (
                  <>
                    <Delta
                      current={
                        orderCents + 3 * downloadCents + (reserveCents ?? 0)
                      }
                      previous={current.budget_cents}
                    />{" "}
                    <small className="sup-muted">
                      atual {money(current.budget_cents)}
                    </small>
                  </>
                ) : undefined
              }
              rows={[
                {
                  label: "Pedido",
                  value: orderCents === null ? "—" : money(orderCents),
                },
                {
                  label: "3 × download",
                  value:
                    downloadCents === null ? "—" : money(3 * downloadCents),
                },
                {
                  label: "Mínimo mensal",
                  value: reserveCents === null ? "—" : money(reserveCents),
                },
                { label: "Vigência", value: "Até atualização" },
              ]}
              footer={
                !reviewing ? (
                  <button
                    type="submit"
                    form="vm-tariff-form"
                    className="btn btn-primary btn-md"
                    disabled={busy}
                  >
                    Revisar publicação
                  </button>
                ) : body ? (
                  <div
                    className="sup-review"
                    role="group"
                    aria-label="Confirmar tarifa"
                  >
                    <p>
                      Publicar{" "}
                      <strong>
                        {money(
                          body.order_fee_cents +
                            3 * body.download_fee_cents +
                            body.monthly_minimum_reserve_cents,
                        )}
                      </strong>{" "}
                      para {accountLabel(body.onr_account_id)} e{" "}
                      {accountLabel(body.infosimples_account_id)}. Fica na
                      auditoria e vale até a próxima atualização.
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
                ) : null
              }
            />
          }
        >
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <form
            id="vm-tariff-form"
            className="sup-composer-form"
            onSubmit={review}
            noValidate
          >
            <ComposerSection
              title="Valores"
              state={states[0]}
              recap={`Pedido ${orderCents === null ? "—" : money(orderCents)} · download ${downloadCents === null ? "—" : money(downloadCents)} · mínimo ${reserveCents === null ? "—" : money(reserveCents)}`}
            >
              {account.provider !== "onr" && (
                <label>
                  Conta RI Digital ativa
                  <select
                    className="input"
                    value={draft.onrAccountId}
                    onChange={(event) =>
                      set("onrAccountId", event.target.value)
                    }
                    disabled={busy}
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
                Pedido (R$)
                <input
                  className="input"
                  inputMode="decimal"
                  value={draft.orderFee}
                  placeholder="0,28"
                  onChange={(event) => set("orderFee", event.target.value)}
                  disabled={busy}
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
                />
              </label>
              <label>
                Mínimo mensal por venda (R$)
                <input
                  className="input"
                  inputMode="decimal"
                  value={draft.monthlyReserve}
                  onChange={(event) =>
                    set("monthlyReserve", event.target.value)
                  }
                  disabled={busy}
                />
                <small>Custo fixo da operação aprovado pelo responsável.</small>
              </label>
            </ComposerSection>

            <ComposerSection
              title="Evidência"
              state={states[1]}
              recap={`SHA ${draft.evidenceSha256.slice(0, 8)}… · ${draft.reason.trim().slice(0, 40)}`}
            >
              <label>
                SHA-256 da evidência privada
                <input
                  className="input"
                  value={draft.evidenceSha256}
                  maxLength={64}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) =>
                    set("evidenceSha256", event.target.value)
                  }
                  disabled={busy}
                />
                <small>Evidência guardada fora do repositório.</small>
              </label>
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
                />
                <small>
                  Fica na auditoria. Sem senhas, tokens ou matrículas.
                </small>
              </label>
            </ComposerSection>

            <ComposerSection
              title="Confirmação"
              state={states[2]}
              recap="Declarações confirmadas"
            >
              <label>
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
              <label>
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
            </ComposerSection>
          </form>
        </Composer>
      )}
    </>
  );
}
