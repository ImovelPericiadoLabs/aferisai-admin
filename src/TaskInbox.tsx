import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { TeamMember } from "./api";
import { dueState } from "./exception-model";
import { GuidedTour, type TourStep } from "./GuidedTour";
import { initialsOf, tintOf } from "./identity";
import { KindGlyph } from "./KindGlyph";
import { ageLabel } from "./ops-model";
import type { Page } from "./team-nav-model";
import { TaskDetail } from "./TaskDetail";
import { useNow } from "./useNow";
import { useWorkQueue } from "./useWorkQueue";
import {
  countTasks,
  filterTasks,
  KIND_LABEL,
  type Task,
  type TaskFilter,
  type TaskTrack,
} from "./work-queue-model";
import "./tasks.css";

const TABS: { id: TaskFilter; label: string }[] = [
  { id: "mine", label: "Para você" },
  { id: "overdue", label: "Atrasadas" },
  { id: "waiting", label: "Com outras pessoas" },
  { id: "all", label: "Todas" },
];

const TOOLS: { page: Page; label: string }[] = [
  { page: "requests", label: "Pedidos" },
  { page: "sources", label: "Fontes" },
  { page: "analyses", label: "Análises" },
  { page: "reconciliation", label: "Conciliação" },
  { page: "onr-review", label: "Prévia ONR" },
  { page: "financial", label: "Exceções" },
];

const TOUR_KEY = "aferis.tour.tasks.v2";
const clock = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const readSeen = () => {
  try {
    return window.localStorage.getItem(TOUR_KEY) === "done";
  } catch {
    return true;
  }
};
const markSeen = () => {
  try {
    window.localStorage.setItem(TOUR_KEY, "done");
  } catch {
    /* the tour just shows again next time */
  }
};

/** One dot per document: green delivered, blue waiting, red with a problem. */
function PurchaseTrack({ track }: { track: TaskTrack }) {
  const dots = Array.from({ length: Math.min(track.total, 8) }, (_, index) =>
    index < track.delivered
      ? "ok"
      : index < track.delivered + track.problems
        ? "bad"
        : "wait",
  );
  const label = `${track.delivered} de ${track.total} documentos entregues${track.problems ? `, ${track.problems} com problema` : ""}`;
  return (
    <span className="tk-track" role="img" aria-label={label}>
      <span className="tk-dots">
        {dots.map((state, index) => (
          <i key={index} data-state={state} />
        ))}
      </span>
      <small>
        {track.delivered}/{track.total}
      </small>
    </span>
  );
}

function PipelineVisual() {
  const stops = ["Pedido", "Pagamento", "Documentos", "Análise", "Entrega"];
  return (
    <div className="tour-flow">
      <ol aria-label="Etapas de uma compra, da esquerda para a direita">
        {stops.map((stop, index) => (
          <li key={stop} style={{ "--i": index } as React.CSSProperties}>
            <i aria-hidden="true" />
            {stop}
          </li>
        ))}
      </ol>
      <p className="tour-branch">
        Se o documento falha: corrigir a entrega ou reembolsar.
      </p>
    </div>
  );
}

function Legend() {
  return (
    <div className="tour-legend">
      <span>
        <span className="tk-dots">
          <i data-state="ok" />
        </span>
        Entregue
      </span>
      <span>
        <span className="tk-dots">
          <i data-state="wait" />
        </span>
        Aguardando
      </span>
      <span>
        <span className="tk-dots">
          <i data-state="bad" />
        </span>
        Problema
      </span>
    </div>
  );
}

const STEPS: TourStep[] = [
  { id: "flow", title: "Como uma compra anda", visual: <PipelineVisual /> },
  {
    id: "tabs",
    target: '[data-tour="tabs"]',
    title: "Comece pela sua vez",
    body: "Aqui só aparece o que precisa de você.",
  },
  {
    id: "row",
    target: '[data-tour="row"]',
    title: "Uma compra, uma linha",
    visual: <Legend />,
    body: "Os pontos são os documentos.",
  },
  {
    id: "detail",
    target: '[data-tour="detail"]',
    title: "Tudo aqui ao lado",
    body: "Decida sem sair da tela.",
  },
  {
    id: "tools",
    target: '[data-tour="tools"]',
    title: "Precisa de mais?",
    body: "As telas completas ficam aqui.",
  },
];

function Avatar({ task }: { task: Task }) {
  if (task.customer)
    return (
      <span
        className="tk-avatar"
        style={tintOf(task.customer)}
        aria-hidden="true"
      >
        {initialsOf(task.customer)}
      </span>
    );
  return (
    <span className="tk-avatar" data-plain aria-hidden="true">
      <KindGlyph kind={task.kind} />
    </span>
  );
}

function TaskItem({
  task,
  now,
  selected,
  first,
  onSelect,
}: {
  task: Task;
  now: number;
  selected: boolean;
  first: boolean;
  onSelect: () => void;
}) {
  const due = task.dueAt ? dueState(task.dueAt, now) : null;
  return (
    <li>
      <button
        type="button"
        className="tk-item"
        aria-current={selected ? "true" : undefined}
        data-lane={task.lane}
        data-tour={first ? "row" : undefined}
        onClick={onSelect}
      >
        <Avatar task={task} />
        <span className="tk-item-main">
          <span className="tk-item-top">
            <strong>{task.customer ?? task.title}</strong>
            {due ? (
              <span className={due.overdue ? "tk-late" : "tk-age"}>
                {due.label}
              </span>
            ) : task.since ? (
              <span className="tk-age">há {ageLabel(task.since, now)}</span>
            ) : null}
          </span>
          <span className="tk-item-sub">
            {task.customer ? task.title : task.subtitle}
          </span>
          <span className="tk-item-foot">
            {task.track ? (
              <PurchaseTrack track={task.track} />
            ) : (
              <small>{KIND_LABEL[task.kind]}</small>
            )}
            {task.who && <small>{task.who}</small>}
          </span>
        </span>
      </button>
    </li>
  );
}

export function TaskInbox({
  role,
  memberId,
  csrf,
  onUnauthorized,
  onOpen,
}: {
  role: TeamMember["role"];
  memberId: string;
  csrf: string;
  onUnauthorized: () => void;
  onOpen: (page: Page, id: string | null) => void;
}) {
  const { tasks, loading, failed, loadedAt, reload, person } = useWorkQueue({
    role,
    memberId,
    onUnauthorized,
  });
  const now = useNow();
  const counts = useMemo(() => countTasks(tasks), [tasks]);
  const [filter, setFilter] = useState<TaskFilter | null>(null);
  const active: TaskFilter = filter ?? (counts.mine > 0 ? "mine" : "all");
  const visible = filterTasks(tasks, active);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [touring, setTouring] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  // A task that just left your list (you did your part) stays open until you pick another.
  const selected =
    visible.find((task) => task.id === selectedId) ??
    tasks.find((task) => task.id === selectedId) ??
    visible[0] ??
    null;

  useEffect(() => {
    if (loading || readSeen()) return;
    const timer = window.setTimeout(() => setTouring(true), 600);
    return () => window.clearTimeout(timer);
  }, [loading]);

  function onListKey(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(".tk-item") ?? [],
    );
    const at = buttons.findIndex((button) => button === document.activeElement);
    const next = buttons[at + (event.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    next.focus();
    next.click();
  }

  const tools =
    role === "financial"
      ? TOOLS.filter((tool) => tool.page === "financial")
      : TOOLS;

  return (
    <section className="page tk" aria-labelledby="tk-title" aria-busy={loading}>
      <header className="page-header">
        <h1 className="page-title" id="tk-title">
          Tarefas
        </h1>
        <div className="tk-head-actions">
          {!loading && <span>Atualizado às {clock.format(loadedAt)}</span>}
          <button
            type="button"
            className="tk-text-button"
            disabled={loading}
            onClick={() => void reload()}
          >
            Atualizar
          </button>
          <button
            type="button"
            className="tk-text-button"
            onClick={() => setTouring(true)}
          >
            Ver tour
          </button>
        </div>
      </header>

      {failed.length > 0 && (
        <div className="alert alert-warning" role="alert">
          Não carregou: {failed.join(", ")}.{" "}
          <button
            type="button"
            className="cj-link"
            onClick={() => void reload()}
          >
            Tentar de novo
          </button>
        </div>
      )}

      <div className="tk-split" data-sheet={sheet || undefined}>
        <div className="tk-listpane">
          <div
            className="tk-filters"
            role="group"
            aria-label="Filtrar tarefas"
            data-tour="tabs"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active === tab.id}
                data-alert={
                  tab.id === "overdue" && counts.overdue > 0 ? "" : undefined
                }
                onClick={() => setFilter(tab.id)}
              >
                <span>{tab.label}</span>
                <b>{counts[tab.id]}</b>
              </button>
            ))}
          </div>

          {loading && tasks.length === 0 ? (
            <div
              className="rules-skeleton"
              role="status"
              aria-label="Carregando"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <span className="skeleton" key={index} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="tk-empty" role="status">
              <strong>
                {active === "all" ? "Nenhuma tarefa" : "Nada para você agora"}
              </strong>
              {active !== "all" && counts.all > 0 && (
                <button
                  type="button"
                  className="tk-text-button"
                  onClick={() => setFilter("all")}
                >
                  Ver todas ({counts.all})
                </button>
              )}
            </div>
          ) : (
            <ul
              className="tk-list"
              ref={listRef}
              onKeyDown={onListKey}
              aria-label="Tarefas"
            >
              {visible.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  now={now}
                  first={index === 0}
                  selected={selected?.id === task.id}
                  onSelect={() => {
                    setSelectedId(task.id);
                    setSheet(true);
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="tk-detailpane" data-tour="detail">
          {selected ? (
            <TaskDetail
              key={selected.id}
              task={selected}
              role={role}
              memberId={memberId}
              csrf={csrf}
              person={person}
              now={now}
              onUnauthorized={onUnauthorized}
              onChanged={reload}
              onOpen={onOpen}
              onBack={() => setSheet(false)}
            />
          ) : (
            <div className="tk-nodetail">Escolha uma tarefa na lista.</div>
          )}
        </div>
      </div>

      <nav className="tk-tools" aria-label="Telas completas" data-tour="tools">
        <span>Abrir a tela completa de</span>
        {tools.map((tool) => (
          <button
            key={tool.page}
            type="button"
            className="tk-text-button"
            onClick={() => onOpen(tool.page, null)}
          >
            {tool.label}
          </button>
        ))}
      </nav>

      <GuidedTour
        steps={STEPS}
        open={touring}
        onClose={() => {
          markSeen();
          setTouring(false);
        }}
      />
    </section>
  );
}
