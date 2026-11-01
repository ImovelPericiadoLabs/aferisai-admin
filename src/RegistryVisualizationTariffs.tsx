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
  type RegistryVisualizationTariffPage,
} from "./api";
import {
  parseBrlCents,
  resolveTariffLimits,
  tariffComplete,
  tariffDraftBody,
  tariffProblems,
  type TariffDraft,
} from "./registry-tariff-model";
import { Composer, Delta, Metrics, SettingCard } from "./SupplierUi";
import { stepStates } from "./account-model";
import { supplierTariffIsCurrent } from "./supplier-tariff-validity";
import { useNow } from "./useNow";
import type { ToastKind } from "./useToast";
import {
  draftFor,
  money,
  tariffStatus,
} from "./registry-visualization-tariffs-model";
import { VisualizationTariffForm } from "./VisualizationTariffForm";
import { VisualizationTariffHistory } from "./VisualizationTariffHistory";
import { VisualizationTariffSummary } from "./VisualizationTariffSummary";

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
  const [rawLimits, setRawLimits] =
    useState<RegistryVisualizationTariffPage["limits"]>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [evidenceFile, setEvidenceFile] = useState("");
  const [draft, setDraft] = useState<TariffDraft>(() =>
    draftFor(account, accounts),
  );
  const [reviewing, setReviewing] = useState(false);
  const now = useNow();
  const [formOpen, setFormOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const activeOnr = accounts.filter(
    (item) => item.provider === "onr" && item.status === "active",
  );
  const activeInfo = accounts.filter(
    (item) => item.provider === "infosimples" && item.status === "active",
  );
  const limits = resolveTariffLimits(rawLimits);
  const body = tariffDraftBody(draft, limits);
  const states = stepStates(tariffComplete(draft, limits));
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
        if (page.limits) setRawLimits(page.limits);
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
      setAttempted(true);
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
      setEvidenceFile("");
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
              onClick={() => {
                setAttempted(false);
                setFormOpen(true);
              }}
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

      <VisualizationTariffHistory
        open={historyOpen}
        tariffs={tariffs}
        cursor={cursor}
        loading={loading}
        previousOf={previousOf}
        accountLabel={accountLabel}
        onClose={() => setHistoryOpen(false)}
        onLoadMore={(next) => void load(next)}
      />

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
            <VisualizationTariffSummary
              orderCents={orderCents}
              downloadCents={downloadCents}
              reserveCents={reserveCents}
              current={current}
              reviewing={reviewing}
              body={body}
              busy={busy}
              confirmRef={confirmRef}
              accountLabel={accountLabel}
              onPublish={() => void publish()}
              onBack={() => setReviewing(false)}
            />
          }
        >
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {attempted && tariffProblems(draft, limits).length > 0 && (
            <div className="alert alert-danger" role="alert">
              Falta ou está inválido: {tariffProblems(draft, limits).join("; ")}
              .
            </div>
          )}
          <VisualizationTariffForm
            account={account}
            draft={draft}
            limits={limits}
            states={states}
            busy={busy}
            evidenceFile={evidenceFile}
            activeOnr={activeOnr}
            activeInfo={activeInfo}
            orderCents={orderCents}
            downloadCents={downloadCents}
            reserveCents={reserveCents}
            set={set}
            setEvidenceFile={setEvidenceFile}
            setError={setError}
            onSubmit={review}
          />
        </Composer>
      )}
    </>
  );
}
