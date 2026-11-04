import { useMemo, useRef, useState } from "react";
import type { PaymentExceptionCase } from "./api";
import {
  canViewOriginals,
  originalTargets,
  dueState,
  nextAction,
  reassignBlock,
  stageLabel,
  stageOf,
} from "./exception-model";
import {
  exceptionSteps,
  money,
  outcomeLabel,
  type Asking,
  type ExecuteAction,
  type Role,
} from "./exception-panel-model";
import {
  CaseCause,
  CaseOverview,
  CaseTurn,
  type CaseNavigation,
} from "./CaseJourneyView";
import { causeOf, journeyOf } from "./case-journey-model";
import { ExceptionDialogs } from "./ExceptionDialogs";
import { ExceptionNextStep } from "./ExceptionNextStep";
import { ExceptionReassign } from "./ExceptionReassign";
import { searchTeamMembers } from "./lookups";
import { OriginalViewer, type OriginalTarget } from "./OriginalViewer";
import { resolveRequestId } from "./original-lookup";
import { stageTone } from "./status-tones";

export { outcomeLabel };
export type { ExecuteAction };

type Props = {
  item: PaymentExceptionCase;
  csrf: string;
  role: Role;
  memberId: string;
  person: (id: string | null) => string;
  busy: boolean;
  error: string;
  notice: string;
  now: number;
  onClose: () => void;
  onUnauthorized: () => void;
  onClaim: () => void;
  onPropose: (
    resolution: "correct" | "refund",
    reason: string,
  ) => Promise<boolean>;
  onConfirm: (reason: string) => Promise<boolean>;
  onReassign: (
    target: "manager" | "financial",
    memberId: string,
    reason: string,
  ) => Promise<boolean>;
  onExecute: (action: ExecuteAction) => void;
  nav?: CaseNavigation;
  /** Shown inside another screen instead of a drawer: no close button, flows with the page. */
  inline?: boolean;
};

export function ExceptionPanel({
  item,
  csrf,
  role,
  memberId,
  person,
  busy,
  error,
  notice,
  now,
  onClose,
  onUnauthorized,
  onClaim,
  onPropose,
  onConfirm,
  onReassign,
  onExecute,
  nav = {},
  inline = false,
}: Props) {
  const [asking, setAsking] = useState<Asking>(null);
  const [resolution, setResolution] = useState<"correct" | "refund">(
    item.proposed_resolution ?? "correct",
  );
  const [target, setTarget] = useState<"manager" | "financial">("manager");
  const [newMember, setNewMember] = useState("");
  const [viewing, setViewing] = useState<OriginalTarget | null>(null);
  const [locating, setLocating] = useState<string | null>(null);
  const [originalError, setOriginalError] = useState("");
  const lastOriginal = useRef<string | null>(null);
  const targets = canViewOriginals(role) ? originalTargets(item) : [];
  const stage = stageOf(item);
  const journey = journeyOf(item);
  const due = dueState(item.due_at, now);
  const action = nextAction(item, role, memberId);
  const canReviseProposal =
    role === "administrator" &&
    item.manager_assignee_id === memberId &&
    item.latest_proposal_id !== null &&
    item.financial_decision_id === null;
  const block = reassignBlock(item, role, target);
  const memberSearch = useMemo(() => searchTeamMembers(target), [target]);

  async function openOriginal(ref: (typeof targets)[number]) {
    if (locating !== null) return;
    setLocating(ref.key);
    lastOriginal.current = ref.key;
    setOriginalError("");
    const found = await resolveRequestId(ref);
    setLocating(null);
    if (!found.ok) {
      if (found.unauthorized) onUnauthorized();
      else setOriginalError(found.message);
      return;
    }
    setViewing({
      requestId: found.requestId,
      title: ref.label,
      facts: [
        { label: "Caso", value: item.id },
        { label: "Trabalho", value: ref.workId },
        { label: "Pedido", value: found.requestId },
      ],
    });
  }

  const steps = exceptionSteps(item, person);

  async function finish(run: () => Promise<boolean>) {
    if (await run()) setAsking(null);
  }

  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="exc-panel-title">
            {item.customer_name ??
              item.customer_email ??
              `Caso ${item.id.slice(0, 8)}`}
          </h2>
          <p className="cj-subtitle">{causeOf(item.reason_code).title}</p>
          <div className="rules-panel-badges">
            <span className={`badge ${stageTone(stage)}`}>
              {stageLabel[stage]}
            </span>
            {stage !== "done" && (
              <span
                className={`badge badge-${due.tone === "danger" ? "danger" : due.tone === "warning" ? "warning" : "neutral"}`}
              >
                {due.label}
              </span>
            )}
          </div>
        </div>
        {!inline && (
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>
      <div className="detail-panel-body">
        {error && (
          <div className="alert alert-danger form-alert" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="alert alert-success form-alert" role="status">
            {notice}
          </div>
        )}
        <div className="cj-act">
          <CaseTurn
            item={item}
            role={role}
            memberId={memberId}
            person={person}
            now={now}
          />
          <ExceptionNextStep
            item={item}
            role={role}
            action={action}
            busy={busy}
            resolution={resolution}
            setResolution={setResolution}
            canReviseProposal={canReviseProposal}
            setAsking={setAsking}
            onClaim={onClaim}
            onExecute={onExecute}
            bare
          />
        </div>
        <CaseOverview
          journey={journey}
          canOpen={canViewOriginals(role)}
          nav={nav}
        />
        <details className="cj-more">
          <summary>Mais detalhes</summary>
          <CaseCause item={item} nav={nav} />
          <section className="detail-panel-section">
            <h3 className="detail-panel-section-title">Quem e quanto</h3>
            <dl className="detail-panel-field">
              <dt>Cliente</dt>
              <dd>{item.customer_name ?? "Não informado"}</dd>
              <dt>E-mail</dt>
              <dd>{item.customer_email ?? "Não informado"}</dd>
              <dt>Pagamento</dt>
              <dd>
                {money(item.amount_cents)}
                {item.funding_source === "credits"
                  ? " em créditos"
                  : item.funding_source === "pix"
                    ? " por PIX"
                    : ""}
              </dd>
              <dt>Gestor</dt>
              <dd>{person(item.manager_assignee_id)}</dd>
              <dt>Financeiro</dt>
              <dd>{person(item.financial_assignee_id)}</dd>
            </dl>
          </section>
          {targets.length > 0 && (
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">Original</h3>
              <p className="form-hint">
                A leitura registra o seu motivo e fica na trilha de auditoria.
              </p>
              {originalError && (
                <div className="alert alert-warning" role="alert">
                  {originalError}
                </div>
              )}
              <div className="exc-originals">
                {targets.map((ref) => (
                  <button
                    key={ref.key}
                    type="button"
                    className="btn btn-secondary btn-md"
                    aria-haspopup="dialog"
                    aria-busy={locating === ref.key}
                    data-original-target={ref.key}
                    onClick={() => void openOriginal(ref)}
                  >
                    {locating === ref.key
                      ? "Localizando…"
                      : `Ver ${ref.label.toLocaleLowerCase("pt-BR")}`}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="detail-panel-section">
            <h3 className="detail-panel-section-title">Andamento</h3>
            <ol className="exc-timeline">
              {steps.map((step) => (
                <li key={step.title} data-state={step.state}>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                  {"note" in step && step.note && <small>{step.note}</small>}
                </li>
              ))}
            </ol>
          </section>
          {role === "administrator" && stage !== "done" && (
            <section className="detail-panel-section">
              <ExceptionReassign
                target={target}
                setTarget={setTarget}
                newMember={newMember}
                setNewMember={setNewMember}
                block={block}
                memberSearch={memberSearch}
                busy={busy}
                setAsking={setAsking}
                onUnauthorized={onUnauthorized}
              />
            </section>
          )}
        </details>
      </div>

      <ExceptionDialogs
        item={item}
        asking={asking}
        setAsking={setAsking}
        busy={busy}
        resolution={resolution}
        target={target}
        newMember={newMember}
        setNewMember={setNewMember}
        person={person}
        finish={finish}
        onPropose={onPropose}
        onConfirm={onConfirm}
        onReassign={onReassign}
        onExecute={onExecute}
      />
      <OriginalViewer
        target={viewing}
        csrf={csrf}
        onClose={() => setViewing(null)}
        onUnauthorized={onUnauthorized}
        returnFocus={() =>
          document.querySelector<HTMLElement>(
            `[data-original-target="${lastOriginal.current}"]`,
          )
        }
      />
    </>
  );
}
