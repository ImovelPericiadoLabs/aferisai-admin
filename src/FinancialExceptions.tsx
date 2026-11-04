import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  listPaymentExceptions,
  type PaymentExceptionCase,
  type TeamMember,
} from "./api";
import { filterCases, sortByUrgency, type CaseFilter } from "./exception-model";
import type { CaseNavigation } from "./CaseJourneyView";
import { ExceptionPanel } from "./ExceptionPanel";
import { errorMessage } from "./financial-exceptions-format";
import { FinancialExceptionsList } from "./FinancialExceptionsList";
import { FinancialExceptionsToolbar } from "./FinancialExceptionsToolbar";
import { useDialogFocus } from "./useDialogFocus";
import { useExceptionActions } from "./useExceptionActions";
import { useTeamNames } from "./useTeamNames";
import "./commercial-rules.css";
import "./FinancialExceptions.css";

type Props = {
  csrf: string;
  memberId: string;
  role: TeamMember["role"];
  onUnauthorized: () => void;
  nav?: CaseNavigation;
  /** Opens this case as soon as the list has it (coming from a task). */
  initialCaseId?: string;
};

export function FinancialExceptions({
  csrf,
  memberId,
  role,
  onUnauthorized,
  nav,
  initialCaseId,
}: Props) {
  const [cases, setCases] = useState<PaymentExceptionCase[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<CaseFilter>("all");
  const scope = filter === "done" ? "done" : "open";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const pagesLoaded = useRef(1);

  const load = useCallback(
    async (cursor?: string, keepPages = 1) => {
      try {
        let page = await listPaymentExceptions(cursor, scope);
        let items = page.items;
        let loaded = 1;
        while (!cursor && page.next_cursor && loaded < keepPages) {
          page = await listPaymentExceptions(page.next_cursor, scope);
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
    [onUnauthorized, scope],
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

  const openedFor = useRef("");
  useEffect(() => {
    if (
      initialCaseId &&
      openedFor.current !== initialCaseId &&
      cases.some((item) => item.id === initialCaseId)
    ) {
      openedFor.current = initialCaseId;
      setSelectedId(initialCaseId);
      setOpen(true);
    }
  }, [cases, initialCaseId]);

  const names = useTeamNames(role);

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
      done: filterCases(cases, "done", memberId, now).length,
    }),
    [cases, memberId, now],
  );
  const selected = cases.find((item) => item.id === selectedId) ?? null;

  function close() {
    setOpen(false);
    actions.reset();
  }

  function changeFilter(next: CaseFilter) {
    if ((next === "done") !== (filter === "done")) {
      setCases([]);
      setNextCursor(null);
      setLoading(true);
      setSelectedId(null);
      setOpen(false);
      pagesLoaded.current = 1;
    }
    setFilter(next);
  }

  useDialogFocus(open, panelRef, close, {
    returnFocus: () =>
      document.querySelector<HTMLElement>(`[data-row-id="${selectedId}"]`),
  });

  function openCase(id: string) {
    setSelectedId(id);
    actions.reset();
    setOpen(true);
  }

  const actions = useExceptionActions({
    csrf,
    item: selected,
    onUnauthorized,
    onChanged: () => load(undefined, pagesLoaded.current),
    onFinished: () => {
      setSelectedId(null);
      setOpen(false);
    },
  });
  const { busy, error: panelError, notice } = actions;

  return (
    <section className="page exceptions" aria-labelledby="exc-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="exc-title">
            Exceções financeiras
          </h1>
          <p className="page-subtitle">
            Casos pagos sem entrega. O prazo começa no primeiro bloqueio e exige
            proposta do gestor e decisão financeira. O administrador pode
            assumir ambas as etapas, com registros separados.
          </p>
        </div>
      </header>

      <FinancialExceptionsToolbar
        error={error}
        loadFailed={loadFailed}
        notice={notice}
        open={open}
        filter={filter}
        scope={scope}
        counts={counts}
        onRetry={() => {
          setLoading(true);
          void load();
        }}
        onFilter={changeFilter}
      />

      <FinancialExceptionsList
        cases={cases}
        visible={visible}
        loading={loading}
        loadFailed={loadFailed}
        filter={filter}
        now={now}
        selectedId={selectedId}
        open={open}
        person={person}
        onOpen={openCase}
        onFilter={changeFilter}
      />

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
                csrf={csrf}
                role={role}
                memberId={memberId}
                person={person}
                busy={busy}
                error={panelError}
                notice={notice}
                now={now}
                onClose={close}
                onUnauthorized={onUnauthorized}
                onClaim={() => void actions.claim()}
                onPropose={actions.propose}
                onConfirm={actions.confirm}
                onReassign={actions.reassign}
                onExecute={(action) => void actions.execute(action)}
                nav={nav}
              />
            )}
          </aside>
        </>,
        document.body,
      )}
    </section>
  );
}
