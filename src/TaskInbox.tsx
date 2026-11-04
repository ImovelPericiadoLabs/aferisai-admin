import { useEffect, useMemo, useState } from "react";
import type { TeamMember } from "./api";
import { dueState } from "./exception-model";
import { GuidedTour, type TourStep } from "./GuidedTour";
import { ageLabel } from "./ops-model";
import type { Page } from "./team-nav-model";
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

const clock = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const TOUR_KEY = "aferis.tour.tasks.v1";

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
        {track.total > 8 && <small>+{track.total - 8}</small>}
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
    title: "Uma linha, uma tarefa",
    visual: <Legend />,
    body: "Os pontos são os documentos da compra.",
  },
  {
    id: "action",
    target: '[data-tour="action"]',
    title: "Um clique e pronto",
    body: "Abre só o que importa.",
  },
  {
    id: "tools",
    target: '[data-tour="tools"]',
    title: "Precisa de mais?",
    body: "As telas completas ficam aqui.",
  },
];

export function TaskInbox({
  role,
  memberId,
  onUnauthorized,
  onOpen,
}: {
  role: TeamMember["role"];
  memberId: string;
  onUnauthorized: () => void;
  onOpen: (page: Page, id: string | null) => void;
}) {
  const { tasks, loading, failed, loadedAt, reload } = useWorkQueue({
    role,
    memberId,
    onUnauthorized,
  });
  const now = useNow();
  const counts = useMemo(() => countTasks(tasks), [tasks]);
  const [filter, setFilter] = useState<TaskFilter | null>(null);
  const active: TaskFilter = filter ?? (counts.mine > 0 ? "mine" : "all");
  const visible = filterTasks(tasks, active);
  const [touring, setTouring] = useState(false);

  useEffect(() => {
    if (loading || readSeen()) return;
    const timer = window.setTimeout(() => setTouring(true), 500);
    return () => window.clearTimeout(timer);
  }, [loading]);

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

      {loading && tasks.length === 0 ? (
        <div className="rules-skeleton" role="status" aria-label="Carregando">
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
        <div className="data-table-wrap tk-wrap">
          <table className="data-table tk-table" aria-label="Tarefas">
            <thead>
              <tr>
                <th scope="col">Tarefa</th>
                <th scope="col">Tipo</th>
                <th scope="col">Documentos</th>
                <th scope="col">Prazo</th>
                <th scope="col">Com quem</th>
                <th scope="col">
                  <span className="sr-only">Abrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  now={now}
                  first={index === 0}
                  onOpen={onOpen}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

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

function TaskRow({
  task,
  now,
  first,
  onOpen,
}: {
  task: Task;
  now: number;
  first: boolean;
  onOpen: (page: Page, id: string | null) => void;
}) {
  const due = task.dueAt ? dueState(task.dueAt, now) : null;
  const go = () => onOpen(task.open.page, task.open.id);
  return (
    <tr
      data-clickable
      data-lane={task.lane}
      data-tour={first ? "row" : undefined}
      onClick={go}
    >
      <td data-label="Tarefa">
        <span className="tk-main">
          <strong>{task.title}</strong>
          <span>{task.subtitle}</span>
        </span>
      </td>
      <td data-label="Tipo" className="tk-type">
        {KIND_LABEL[task.kind]}
      </td>
      <td data-label="Documentos">
        {task.track ? (
          <PurchaseTrack track={task.track} />
        ) : (
          <span className="tk-none">—</span>
        )}
      </td>
      <td data-label="Prazo">
        {due ? (
          <span className={due.overdue ? "tk-late" : undefined}>
            {due.label}
          </span>
        ) : task.since ? (
          <span className="tk-age">há {ageLabel(task.since, now)}</span>
        ) : (
          <span className="tk-none">—</span>
        )}
      </td>
      <td data-label="Com quem" className="tk-who">
        {task.who ?? "—"}
      </td>
      <td className="tk-action">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          data-tour={first ? "action" : undefined}
          onClick={(event) => {
            event.stopPropagation();
            go();
          }}
        >
          {task.action}
        </button>
      </td>
    </tr>
  );
}
