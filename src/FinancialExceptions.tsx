import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  claimPaymentException,
  confirmPaymentException,
  executePaymentException,
  listPaymentExceptions,
  listTeamMembers,
  proposePaymentException,
  reassignPaymentException,
  type PaymentExceptionCase,
  type TeamMember,
} from "./api";
import {
  dueState,
  filterCases,
  sortByUrgency,
  stageLabel,
  stageOf,
  type CaseFilter,
} from "./exception-model";
import {
  ExceptionPanel,
  outcomeLabel,
  type ExecuteAction,
} from "./ExceptionPanel";
import { stageTone } from "./status-tones";
import { useDialogFocus } from "./useDialogFocus";
import "./commercial-rules.css";
import "./FinancialExceptions.css";

type Props = {
  csrf: string;
  memberId: string;
  role: TeamMember["role"];
  onUnauthorized: () => void;
};

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

const tabs: { value: CaseFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "overdue", label: "Atrasados" },
  { value: "mine", label: "Meus" },
  { value: "executing", label: "Em execução" },
];

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.detail : fallback;
}

export function FinancialExceptions({
  csrf,
  memberId,
  role,
  onUnauthorized,
}: Props) {
  const [cases, setCases] = useState<PaymentExceptionCase[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [panelError, setPanelError] = useState("");
  const [notice, setNotice] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const panelRef = useRef<HTMLElement>(null);
  const pagesLoaded = useRef(1);

  const load = useCallback(
    async (cursor?: string, keepPages = 1) => {
      try {
        let page = await listPaymentExceptions(cursor);
        let items = page.items;
        let loaded = 1;
        while (!cursor && page.next_cursor && loaded < keepPages) {
          page = await listPaymentExceptions(page.next_cursor);
          items = [...items, ...page.items];
          loaded += 1;
        }
        pagesLoaded.current = cursor ? pagesLoaded.current + 1 : loaded;
        setCases((current) => (cursor ? [...current, ...items] : items));
        setNextCursor(page.next_cursor);
        setNow(Date.now());
        setLoadFailed(false);
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else {
          setLoadFailed(true);
          setError(errorMessage(cause, "Não foi possível carregar os casos."));
        }
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (live) void load();
    });
    return () => {
      live = false;
    };
  }, [load]);

  useEffect(() => {
    if (role !== "administrator") return;
    let live = true;
    void (async () => {
      const found: Record<string, string> = {};
      let cursor: string | undefined;
      try {
        for (let pageCount = 0; pageCount < 10; pageCount += 1) {
          const page = await listTeamMembers(cursor);
          for (const member of page.items) found[member.id] = member.email;
          if (!page.next_cursor) break;
          cursor = page.next_cursor;
        }
      } catch {
        /* names are a convenience; the list still works without them */
      }
      if (live) setNames(found);
    })();
    return () => {
      live = false;
    };
  }, [role]);

  const person = useCallback(
    (id: string | null) => {
      if (!id) return "Sem responsável";
      if (id === memberId) return "Você";
      return names[id] ?? "Outra pessoa";
    },
    [memberId, names],
  );

  const sorted = useMemo(() => sortByUrgency(cases, now), [cases, now]);
  const visible = useMemo(
    () => filterCases(sorted, filter, memberId, now),
    [sorted, filter, memberId, now],
  );
  const counts = useMemo(
    () => ({
      all: cases.length,
      overdue: filterCases(cases, "overdue", memberId, now).length,
      mine: filterCases(cases, "mine", memberId, now).length,
      executing: filterCases(cases, "executing", memberId, now).length,
    }),
    [cases, memberId, now],
  );
  const selected = cases.find((item) => item.id === selectedId) ?? null;

  function close() {
    setOpen(false);
    setPanelError("");
  }

  useDialogFocus(open, panelRef, close, {
    returnFocus: () =>
      document.querySelector<HTMLElement>(`[data-row-id="${selectedId}"]`),
  });

  function openCase(id: string) {
    setSelectedId(id);
    setNotice("");
    setPanelError("");
    setOpen(true);
  }

  async function run(
    work: () => Promise<unknown>,
    success: string,
    fallback: string,
  ): Promise<boolean> {
    setBusy(true);
    setPanelError("");
    setNotice("");
    try {
      const result = await work();
      await load(undefined, pagesLoaded.current);
      setNotice(typeof result === "string" ? result : success);
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
        return false;
      }
      setPanelError(errorMessage(cause, fallback));
      await load(undefined, pagesLoaded.current);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const claim = () =>
    selected &&
    void run(
      () => claimPaymentException(selected.id, csrf),
      "Caso atribuído à sua conta.",
      "Não foi possível assumir o caso.",
    );

  const propose = (resolution: "correct" | "refund", reason: string) =>
    selected
      ? run(
          () => proposePaymentException(selected.id, resolution, reason, csrf),
          "Proposta registrada. Aguarda confirmação do financeiro.",
          "Não foi possível registrar a proposta.",
        )
      : Promise.resolve(false);

  const confirm = (reason: string) =>
    selected && selected.latest_proposal_id
      ? run(
          () =>
            confirmPaymentException(
              selected.id,
              selected.latest_proposal_id as string,
              reason,
              csrf,
            ),
          "Decisão financeira registrada. Execute a solução.",
          "Não foi possível registrar a decisão.",
        )
      : Promise.resolve(false);

  const reassign = (
    target: "manager" | "financial",
    newMemberId: string,
    reason: string,
  ) =>
    selected
      ? run(
          () =>
            reassignPaymentException(
              selected.id,
              target,
              newMemberId,
              reason,
              csrf,
            ),
          "Responsável alterado. O motivo foi registrado no histórico.",
          "Não foi possível reatribuir o caso.",
        )
      : Promise.resolve(false);

  const execute = (action: ExecuteAction) =>
    selected &&
    run(
      async () => {
        const result = await executePaymentException(selected.id, action, csrf);
        return result.status === "done"
          ? "Solução confirmada."
          : "Tentativa registrada. Consulte a conciliação para confirmar o resultado.";
      },
      "",
      "Não foi possível executar a solução.",
    );

  return (
    <section className="page exceptions" aria-labelledby="exc-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="exc-title">
            Exceções financeiras
          </h1>
          <p className="page-subtitle">
            Casos pagos sem entrega. O prazo começa no primeiro bloqueio e exige
            proposta do gestor e confirmação do financeiro.
          </p>
        </div>
      </header>

      {error && !open && (
        <div className="alert alert-danger rules-alert" role="alert">
          {error}
          {loadFailed && (
            <>
              {" "}
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
              >
                Tentar novamente
              </button>
            </>
          )}
        </div>
      )}
      {notice && !open && (
        <div className="alert alert-success rules-alert" role="status">
          {notice}
        </div>
      )}

      <div className="rules-toolbar">
        <div className="rules-tabs" role="group" aria-label="Filtrar casos">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className="rules-tab"
              aria-pressed={filter === tab.value}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
              <span className="rules-tab-count">{counts[tab.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && cases.length === 0 ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : visible.length === 0 && !loadFailed ? (
        <div className="empty-state" role="status">
          <strong>
            {filter === "all"
              ? "Nenhum caso financeiro"
              : "Nenhum caso neste filtro"}
          </strong>
          <span>
            {filter === "all"
              ? "Quando um pagamento ficar sem entrega, o caso aparece aqui com prazo para decidir."
              : "Escolha outro filtro para ver os demais casos."}
          </span>
          {filter !== "all" && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => setFilter("all")}
            >
              Limpar filtro
            </button>
          )}
        </div>
      ) : (
        visible.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table" aria-label="Casos financeiros">
              <thead>
                <tr>
                  <th scope="col">Caso</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Prazo</th>
                  <th scope="col">Etapa</th>
                  <th scope="col">Responsáveis</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const stage = stageOf(item);
                  const due = dueState(item.due_at, now);
                  return (
                    <tr
                      key={item.id}
                      data-clickable
                      className={
                        item.id === selectedId && open ? "selected" : undefined
                      }
                      onClick={() => openCase(item.id)}
                    >
                      <td data-label="Caso">
                        <button
                          className="rules-cell-button"
                          data-row-id={item.id}
                          type="button"
                          aria-haspopup="dialog"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCase(item.id);
                          }}
                        >
                          <strong>Caso {item.id.slice(0, 8)}</strong>
                          <small>Trabalho {item.work_id}</small>
                        </button>
                      </td>
                      <td data-label="Valor">{money(item.amount_cents)}</td>
                      <td data-label="Prazo">
                        {stage === "done" ? (
                          <span className="rules-cell-sub">Encerrado</span>
                        ) : (
                          <span
                            className={`badge badge-${due.tone === "neutral" ? "neutral" : due.tone}`}
                          >
                            {due.label}
                          </span>
                        )}
                      </td>
                      <td data-label="Etapa">
                        <span className="rules-cell-stack">
                          <span>
                            <span className={`badge ${stageTone(stage)}`}>
                              {stageLabel[stage]}
                            </span>
                          </span>
                          {(item.resolution ?? item.proposed_resolution) && (
                            <small className="rules-cell-sub">
                              {outcomeLabel(
                                item.resolution ?? item.proposed_resolution,
                              )}
                            </small>
                          )}
                        </span>
                      </td>
                      <td data-label="Responsáveis">
                        <span className="exc-people">
                          <small className="rules-cell-sub">
                            Gestor: {person(item.manager_assignee_id)}
                          </small>
                          <small className="rules-cell-sub">
                            Financeiro: {person(item.financial_assignee_id)}
                          </small>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {nextCursor && (
        <footer className="rules-footer">
          <span>{cases.length} casos carregados</span>
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={busy}
            onClick={() => void load(nextCursor)}
          >
            Carregar mais
          </button>
        </footer>
      )}

      {createPortal(
        <>
          {open && <div className="detail-panel-overlay" onClick={close} />}
          <aside
            className={`detail-panel${open ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exc-panel-title"
            aria-hidden={!open}
            ref={panelRef}
          >
            {open && selected && (
              <ExceptionPanel
                key={selected.id}
                item={selected}
                role={role}
                memberId={memberId}
                person={person}
                busy={busy}
                error={panelError}
                notice={notice}
                now={now}
                onClose={close}
                onUnauthorized={onUnauthorized}
                onClaim={() => void claim()}
                onPropose={propose}
                onConfirm={confirm}
                onReassign={reassign}
                onExecute={(action) => void execute(action)}
              />
            )}
          </aside>
        </>,
        document.body,
      )}
    </section>
  );
}
