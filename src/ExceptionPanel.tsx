import { useMemo, useRef, useState } from "react";
import type { PaymentExceptionCase, TeamMember } from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { Disclosure, RadioGroup } from "./controls";
import { statusLabel } from "./display-labels";
import {
  affectedItemRows,
  canViewOriginals,
  originalTargets,
  dueState,
  nextAction,
  reassignBlock,
  stageLabel,
  stageOf,
} from "./exception-model";
import { EntityPicker } from "./EntityPicker";
import { searchTeamMembers } from "./lookups";
import { OriginalViewer, type OriginalTarget } from "./OriginalViewer";
import { resolveRequestId } from "./original-lookup";
import { stageTone } from "./status-tones";

type Role = TeamMember["role"];
type Asking = null | "propose" | "confirm" | "refund" | "reassign";
export type ExecuteAction =
  "refund-attempts" | "refund-reconciliations" | "correction-verifications";

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
};

export const outcomeLabel = (value: "correct" | "refund" | null) =>
  value === "correct"
    ? "Corrigir entrega"
    : value === "refund"
      ? "Reembolsar"
      : "A decidir";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

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
}: Props) {
  const [asking, setAsking] = useState<Asking>(null);
  const [resolution, setResolution] = useState<"correct" | "refund">("correct");
  const [target, setTarget] = useState<"manager" | "financial">("manager");
  const [newMember, setNewMember] = useState("");
  const [viewing, setViewing] = useState<OriginalTarget | null>(null);
  const [locating, setLocating] = useState<string | null>(null);
  const [originalError, setOriginalError] = useState("");
  const lastOriginal = useRef<string | null>(null);
  const targets = canViewOriginals(role) ? originalTargets(item) : [];
  const stage = stageOf(item);
  const affectedRows = affectedItemRows(item);
  const due = dueState(item.due_at, now);
  const action = nextAction(item, role, memberId);
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

  const steps = [
    {
      title: "Bloqueio aberto",
      detail: dateTime.format(new Date(item.opened_at)),
      state: "done",
    },
    {
      title: "Proposta do gestor",
      detail: item.latest_proposal_id
        ? `${outcomeLabel(item.proposed_resolution)} · ${person(item.proposal_actor_id)}${item.proposal_at ? ` · ${dateTime.format(new Date(item.proposal_at))}` : ""}`
        : "Aguardando proposta",
      note: item.proposal_reason,
      state: item.latest_proposal_id ? "done" : "current",
    },
    {
      title: "Decisão do financeiro",
      detail: item.financial_decision_id
        ? outcomeLabel(item.resolution)
        : item.latest_proposal_id
          ? "Aguardando confirmação"
          : "Depois da proposta",
      state: item.financial_decision_id
        ? "done"
        : item.latest_proposal_id
          ? "current"
          : "pending",
    },
    {
      title: "Execução",
      detail: item.financial_decision_id
        ? item.execution_status
          ? statusLabel(item.execution_status)
          : "A iniciar"
        : "Depois da decisão",
      state:
        item.execution_status === "done"
          ? "done"
          : item.financial_decision_id
            ? "current"
            : "pending",
    },
  ] as const;

  async function finish(run: () => Promise<boolean>) {
    if (await run()) setAsking(null);
  }

  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="exc-panel-title">
            Caso {item.id.slice(0, 8)}
          </h2>
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
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-label="Fechar"
          onClick={onClose}
        >
          ✕
        </button>
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
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Resumo</h3>
          <dl className="detail-panel-field">
            <dt>Valor pago</dt>
            <dd>{money(item.amount_cents)}</dd>
            <dt>Trabalho</dt>
            <dd>{item.work_id}</dd>
            <dt>Prazo para decidir</dt>
            <dd>{dateTime.format(new Date(item.due_at))}</dd>
            <dt>Código técnico</dt>
            <dd>{item.reason_code}</dd>
            <dt>Gestor</dt>
            <dd>{person(item.manager_assignee_id)}</dd>
            <dt>Financeiro</dt>
            <dd>{person(item.financial_assignee_id)}</dd>
          </dl>
        </section>
        {affectedRows.length > 0 && (
          <section className="detail-panel-section">
            <h3 className="detail-panel-section-title">
              Documentos da compra ({affectedRows.length})
            </h3>
            <ul className="exc-affected">
              {affectedRows.map((row) => (
                <li key={row.key}>
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                  {row.error && (
                    <span className="badge badge-danger">{row.error}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
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
        <section className="detail-panel-section">
          <h3 className="detail-panel-section-title">Próximo passo</h3>
          {action.kind === "wait" && (
            <p className="form-hint">{action.reason}</p>
          )}
          {action.kind === "none" && (
            <p className="form-hint">Este caso está concluído.</p>
          )}
          {action.kind === "claim" && (
            <button
              className="btn btn-primary btn-md"
              type="button"
              disabled={busy}
              onClick={onClaim}
            >
              Assumir este caso
            </button>
          )}
          {action.kind === "propose" && (
            <div className="exc-stack">
              <RadioGroup
                name="exc-resolution"
                legend="Encaminhamento"
                value={resolution}
                onChange={(value) =>
                  setResolution(value as "correct" | "refund")
                }
                options={[
                  {
                    value: "correct",
                    label: "Corrigir entrega",
                    description: "O titular recebe o que pagou.",
                  },
                  {
                    value: "refund",
                    label: "Reembolsar",
                    description: "Devolver o valor pago.",
                  },
                ]}
              />
              <button
                className="btn btn-primary btn-md"
                type="button"
                disabled={busy}
                onClick={() => setAsking("propose")}
              >
                Registrar proposta
              </button>
            </div>
          )}
          {action.kind === "confirm" && (
            <button
              className="btn btn-primary btn-md"
              type="button"
              disabled={busy}
              onClick={() => setAsking("confirm")}
            >
              Confirmar decisão financeira
            </button>
          )}
          {action.kind === "start-refund" && (
            <button
              className="btn btn-danger btn-md"
              type="button"
              disabled={busy}
              onClick={() => setAsking("refund")}
            >
              Iniciar estorno integral
            </button>
          )}
          {action.kind === "reconcile-refund" && (
            <button
              className="btn btn-secondary btn-md"
              type="button"
              disabled={busy}
              onClick={() => onExecute("refund-reconciliations")}
            >
              Conciliar estorno
            </button>
          )}
          {action.kind === "verify-correction" && (
            <button
              className="btn btn-secondary btn-md"
              type="button"
              disabled={busy}
              onClick={() => onExecute("correction-verifications")}
            >
              Verificar entrega corrigida
            </button>
          )}
          <div className="alert exc-note" role="note">
            Nenhum estorno PIX é automático. Confirme a execução e a conciliação
            no Asaas antes de comunicar o encerramento ao titular.
          </div>
        </section>
        {role === "administrator" && stage !== "done" && (
          <section className="detail-panel-section">
            <Disclosure title="Substituir responsável indisponível">
              <div className="exc-stack">
                <RadioGroup
                  name="exc-target"
                  legend="Função"
                  value={target}
                  onChange={(value) => {
                    setTarget(value as "manager" | "financial");
                    setNewMember("");
                  }}
                  options={[
                    { value: "manager", label: "Gestor" },
                    { value: "financial", label: "Financeiro" },
                  ]}
                />
                <EntityPicker
                  key={target}
                  id="exc-member"
                  label="Nova pessoa"
                  placeholder="Buscar pelo e-mail"
                  disabled={block !== null}
                  value={newMember}
                  search={memberSearch}
                  cacheKey={target}
                  onUnauthorized={onUnauthorized}
                  onChange={(id) => setNewMember(id)}
                />
                {block && <p className="form-hint">{block}</p>}
                <button
                  className="btn btn-secondary btn-md"
                  type="button"
                  disabled={busy || block !== null || !newMember}
                  onClick={() => setAsking("reassign")}
                >
                  Reatribuir
                </button>
              </div>
            </Disclosure>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={asking === "propose"}
        title="Registrar proposta?"
        description="A proposta segue para confirmação de uma pessoa do financeiro."
        details={[
          { label: "Encaminhamento", value: outcomeLabel(resolution) },
          { label: "Valor", value: money(item.amount_cents) },
        ]}
        reason={{ label: "Motivo da proposta", min: 10, max: 500 }}
        confirmLabel="Registrar proposta"
        busy={busy}
        onConfirm={(reason) => void finish(() => onPropose(resolution, reason))}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "confirm"}
        title="Confirmar decisão financeira?"
        description="Depois da confirmação, a execução passa a ser sua responsabilidade."
        details={[
          { label: "Proposta", value: outcomeLabel(item.proposed_resolution) },
          { label: "Motivo do gestor", value: item.proposal_reason ?? "—" },
          { label: "Valor", value: money(item.amount_cents) },
        ]}
        reason={{ label: "Motivo da decisão", min: 10, max: 500 }}
        confirmLabel="Confirmar decisão"
        busy={busy}
        onConfirm={(reason) => void finish(() => onConfirm(reason))}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "refund"}
        tone="danger"
        title="Iniciar estorno integral?"
        description="O estorno é solicitado ao Asaas sandbox e não pode ser desfeito por este painel."
        details={[
          { label: "Valor", value: money(item.amount_cents) },
          { label: "Trabalho", value: item.work_id },
        ]}
        confirmLabel="Iniciar estorno"
        busy={busy}
        onConfirm={() => {
          setAsking(null);
          onExecute("refund-attempts");
        }}
        onCancel={() => setAsking(null)}
      />
      <ConfirmDialog
        open={asking === "reassign"}
        title="Reatribuir o caso?"
        description="A pessoa anterior deixa de ser responsável. O motivo fica no histórico."
        details={[
          {
            label: "Função",
            value: target === "manager" ? "Gestor" : "Financeiro",
          },
          {
            label: "Atual",
            value: person(
              target === "manager"
                ? item.manager_assignee_id
                : item.financial_assignee_id,
            ),
          },
        ]}
        reason={{ label: "Motivo da troca", min: 10, max: 500 }}
        confirmLabel="Reatribuir"
        busy={busy}
        onConfirm={(reason) =>
          void finish(async () => {
            const done = await onReassign(target, newMember, reason);
            if (done) setNewMember("");
            return done;
          })
        }
        onCancel={() => setAsking(null)}
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
