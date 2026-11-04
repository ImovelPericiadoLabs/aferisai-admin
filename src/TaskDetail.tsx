import { useCallback } from "react";
import type { PaymentExceptionCase, TeamMember } from "./api";
import type { CaseNavigation } from "./CaseJourneyView";
import { ExceptionPanel } from "./ExceptionPanel";
import { initialsOf, tintOf } from "./identity";
import { JourneyRail } from "./JourneyRail";
import { KindGlyph } from "./KindGlyph";
import type { Page } from "./team-nav-model";
import { useExceptionActions } from "./useExceptionActions";
import type { Task } from "./work-queue-model";

const WHERE: Record<Task["kind"], string> = {
  case: "Exceções",
  send: "Conciliação",
  preview: "Prévia ONR",
  analysis: "Análises",
  source: "Fontes",
};

/** A case worked on right here: take it, propose, confirm, execute, with the reasons as options. */
function CaseWorkspace({
  item,
  role,
  memberId,
  csrf,
  person,
  now,
  nav,
  onUnauthorized,
  onChanged,
}: {
  item: PaymentExceptionCase;
  role: TeamMember["role"];
  memberId: string;
  csrf: string;
  person: (id: string | null) => string;
  now: number;
  nav: CaseNavigation;
  onUnauthorized: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const actions = useExceptionActions({
    csrf,
    item,
    onUnauthorized,
    onChanged,
    onFinished: () => undefined,
  });
  return (
    <ExceptionPanel
      inline
      item={item}
      csrf={csrf}
      role={role}
      memberId={memberId}
      person={person}
      busy={actions.busy}
      error={actions.error}
      notice={actions.notice}
      now={now}
      onClose={() => undefined}
      onUnauthorized={onUnauthorized}
      onClaim={() => void actions.claim()}
      onPropose={actions.propose}
      onConfirm={actions.confirm}
      onReassign={actions.reassign}
      onExecute={(action) => void actions.execute(action)}
      nav={nav}
    />
  );
}

/** Everything about the selected task: who, where it is on the purchase, and what to do. */
export function TaskDetail({
  task,
  role,
  memberId,
  csrf,
  person,
  now,
  onUnauthorized,
  onChanged,
  onOpen,
  onBack,
}: {
  task: Task;
  role: TeamMember["role"];
  memberId: string;
  csrf: string;
  person: (id: string | null) => string;
  now: number;
  onUnauthorized: () => void;
  onChanged: () => Promise<unknown>;
  onOpen: (page: Page, id: string | null) => void;
  onBack: () => void;
}) {
  const nav: CaseNavigation = {
    openPage: (page) => onOpen(page, null),
    openSource: (requestId) => onOpen("sources", requestId),
    openAnalysis: (workId) => onOpen("analyses", workId),
  };
  const tint = task.customer ? tintOf(task.customer) : undefined;
  const back = useCallback(onBack, [onBack]);
  return (
    <article className="td" aria-label={task.customer ?? task.title}>
      <button type="button" className="td-back" onClick={back}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
        Tarefas
      </button>
      {task.exception ? (
        <CaseWorkspace
          item={task.exception}
          role={role}
          memberId={memberId}
          csrf={csrf}
          person={person}
          now={now}
          nav={nav}
          onUnauthorized={onUnauthorized}
          onChanged={onChanged}
        />
      ) : (
        <>
          <header className="td-head">
            <span className="td-avatar" style={tint} aria-hidden="true">
              {task.customer ? (
                initialsOf(task.customer)
              ) : (
                <KindGlyph kind={task.kind} size={22} />
              )}
            </span>
            <div>
              <h2>{task.customer ?? task.title}</h2>
              <p>{task.customer ? task.title : task.subtitle}</p>
            </div>
          </header>
          <JourneyRail steps={task.rail} />
          <section className="td-do">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => onOpen(task.open.page, task.open.id)}
            >
              {task.action} em {WHERE[task.kind]}
            </button>
          </section>
        </>
      )}
    </article>
  );
}
