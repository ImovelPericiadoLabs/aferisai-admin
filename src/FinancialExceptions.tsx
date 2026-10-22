import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  claimPaymentException,
  confirmPaymentException,
  executePaymentException,
  listPaymentExceptions,
  proposePaymentException,
  reassignPaymentException,
  type PaymentExceptionCase,
  type TeamMember,
} from "./api";
import "./FinancialExceptions.css";

type Props = {
  csrf: string;
  memberId: string;
  role: TeamMember["role"];
  onUnauthorized: () => void;
};

const outcome = (value: "correct" | "refund" | null) =>
  value === "correct"
    ? "Corrigir entrega"
    : value === "refund"
      ? "Reembolsar"
      : "A decidir";

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

export function FinancialExceptions({
  csrf,
  memberId,
  role,
  onUnauthorized,
}: Props) {
  const [cases, setCases] = useState<PaymentExceptionCase[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState<"correct" | "refund">("correct");
  const [reassignRole, setReassignRole] = useState<"manager" | "financial">(
    "manager",
  );
  const [newMemberId, setNewMemberId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(
    async (cursor?: string) => {
      if (!cursor) setListLoading(true);
      try {
        const page = await listPaymentExceptions(cursor);
        setCases((current) =>
          cursor ? [...current, ...page.items] : page.items,
        );
        setNextCursor(page.next_cursor);
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar os casos.",
          );
      } finally {
        setListLoading(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const active = cases.find((item) => item.id === selected);
  const canPropose = role === "manager" || role === "administrator";
  const canConfirm = role === "financial";
  const assignedId = active
    ? canConfirm
      ? active.financial_assignee_id
      : active.manager_assignee_id
    : null;

  async function claim() {
    if (!active) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await claimPaymentException(active.id, csrf);
      await load();
      setNotice("Caso atribuído à sua conta.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível assumir o caso.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (canPropose) {
        await proposePaymentException(active.id, resolution, reason, csrf);
        setNotice(
          "Proposta do gestor registrada. Aguarda confirmação do financeiro.",
        );
      } else if (canConfirm && active.latest_proposal_id) {
        await confirmPaymentException(
          active.id,
          active.latest_proposal_id,
          reason,
          csrf,
        );
        setNotice("Decisão financeira registrada. Execute a solução abaixo.");
      }
      setReason("");
      await load();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível registrar a decisão.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function reassign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await reassignPaymentException(
        active.id,
        reassignRole,
        newMemberId,
        reassignReason,
        csrf,
      );
      setNewMemberId("");
      setReassignReason("");
      await load();
      setNotice("Responsável alterado; o motivo foi registrado no histórico.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível reatribuir o caso.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function execute(
    action:
      "refund-attempts" | "refund-reconciliations" | "correction-verifications",
  ) {
    if (!active) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const execution = await executePaymentException(active.id, action, csrf);
      await load();
      setNotice(
        execution.status === "done"
          ? "Solução confirmada."
          : "Tentativa registrada. Consulte a conciliação para confirmar o resultado.",
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível executar a solução.",
        );
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="financial-exceptions">
      <header>
        <p className="eyebrow">Primeira venda · PIX sandbox</p>
        <h1>Exceções financeiras</h1>
        <p>
          Casos pagos sem entrega. O prazo começa no primeiro bloqueio e exige
          proposta do gestor e confirmação por uma pessoa do financeiro.
        </p>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="profile-saved" role="status">
          {notice}
        </p>
      )}
      {listLoading && cases.length === 0 && (
        <div
          className="skeleton-rows"
          role="status"
          aria-label="Carregando casos"
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                padding: "1rem",
                border: "1px solid var(--line)",
                borderRadius: "0.8rem",
                display: "grid",
                gap: "0.5rem",
              }}
            >
              <div
                className="skeleton"
                style={{ height: "0.9rem", width: "60%" }}
              />
              <div
                className="skeleton"
                style={{ height: "0.75rem", width: "45%" }}
              />
              <div
                className="skeleton"
                style={{ height: "0.75rem", width: "50%" }}
              />
            </div>
          ))}
        </div>
      )}
      {!listLoading && cases.length === 0 && !error && (
        <p className="directory-state">Nenhum caso financeiro nesta página.</p>
      )}
      <div className="financial-grid">
        <div className="financial-list" aria-label="Casos financeiros">
          {cases.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                selected === item.id
                  ? "financial-item selected"
                  : "financial-item"
              }
              onClick={() => {
                setSelected(item.id);
                setReason("");
                setNotice("");
              }}
            >
              <strong>Caso {item.id}</strong>
              <span>
                Valor:{" "}
                {(item.amount_cents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
              <span>Prazo: {dateTime(item.due_at)}</span>
              <span>
                <span
                  className={`badge ${item.financial_decision_id ? "badge-green" : item.latest_proposal_id ? "badge-blue" : "badge-gray"}`}
                >
                  {item.financial_decision_id
                    ? `Decidido: ${outcome(item.resolution)}`
                    : item.latest_proposal_id
                      ? `Proposto: ${outcome(item.proposed_resolution)}`
                      : "Sem proposta"}
                </span>
              </span>
            </button>
          ))}
          {nextCursor && (
            <button type="button" onClick={() => void load(nextCursor)}>
              Carregar mais
            </button>
          )}
        </div>
        {active && (
          <article className="financial-detail">
            <h2>Tratamento do caso</h2>
            <dl>
              <dt>Trabalho</dt>
              <dd>{active.work_id}</dd>
              <dt>Primeiro bloqueio</dt>
              <dd>{dateTime(active.opened_at)}</dd>
              <dt>Prazo para decidir</dt>
              <dd>{dateTime(active.due_at)}</dd>
              <dt>Código técnico</dt>
              <dd>{active.reason_code}</dd>
              <dt>Gestor responsável</dt>
              <dd>{active.manager_assignee_id || "Aguardando atribuição"}</dd>
              <dt>Financeiro responsável</dt>
              <dd>{active.financial_assignee_id || "Aguardando atribuição"}</dd>
            </dl>
            {role === "administrator" && !active.financial_decision_id && (
              <form
                onSubmit={(event) => void reassign(event)}
                className="financial-form"
              >
                <h3>Substituir responsável indisponível</h3>
                <label>
                  Função
                  <select
                    value={reassignRole}
                    onChange={(event) =>
                      setReassignRole(
                        event.target.value as "manager" | "financial",
                      )
                    }
                  >
                    <option value="manager">Gestor</option>
                    <option value="financial">Financeiro</option>
                  </select>
                </label>
                <label>
                  ID do novo membro ativo
                  <input
                    required
                    value={newMemberId}
                    onChange={(event) => setNewMemberId(event.target.value)}
                  />
                </label>
                <label>
                  Motivo
                  <input
                    required
                    minLength={10}
                    maxLength={500}
                    value={reassignReason}
                    onChange={(event) => setReassignReason(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    busy ||
                    (reassignRole === "manager" &&
                      Boolean(active.latest_proposal_id))
                  }
                >
                  Reatribuir
                </button>
              </form>
            )}
            {active.latest_proposal_id && (
              <div className="financial-proposal">
                <strong>
                  Proposta vigente: {outcome(active.proposed_resolution)}
                </strong>
                <p>{active.proposal_reason}</p>
                <small>
                  Gestor {active.proposal_actor_id} ·{" "}
                  {active.proposal_at ? dateTime(active.proposal_at) : ""}
                </small>
              </div>
            )}
            {active.financial_decision_id ? (
              <div role="status">
                <p>
                  Decisão registrada: {outcome(active.resolution)}. Execução:{" "}
                  {active.execution_status ?? "a iniciar"}.
                </p>
                {canConfirm &&
                  assignedId === memberId &&
                  active.resolution === "refund" &&
                  !active.execution_status && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void execute("refund-attempts")}
                    >
                      Iniciar estorno integral no Asaas sandbox
                    </button>
                  )}
                {canConfirm &&
                  assignedId === memberId &&
                  active.resolution === "refund" &&
                  active.execution_status &&
                  active.execution_status !== "done" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void execute("refund-reconciliations")}
                    >
                      Conciliar estorno por GET
                    </button>
                  )}
                {canConfirm &&
                  assignedId === memberId &&
                  active.resolution === "correct" &&
                  active.execution_status !== "done" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void execute("correction-verifications")}
                    >
                      Verificar entrega corrigida
                    </button>
                  )}
              </div>
            ) : (canPropose || canConfirm) && !assignedId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void claim()}
              >
                {busy ? "Atribuindo…" : "Assumir este caso"}
              </button>
            ) : (canPropose || canConfirm) && assignedId !== memberId ? (
              <p>Este caso já foi atribuído a outra pessoa do seu papel.</p>
            ) : canConfirm && !active.latest_proposal_id ? (
              <p>Aguardando proposta do gestor.</p>
            ) : canPropose || canConfirm ? (
              <form className="form" onSubmit={(event) => void submit(event)}>
                {canPropose && (
                  <label>
                    Encaminhamento
                    <select
                      value={resolution}
                      onChange={(event) =>
                        setResolution(
                          event.target.value as "correct" | "refund",
                        )
                      }
                    >
                      <option value="correct">Corrigir entrega</option>
                      <option value="refund">Reembolsar</option>
                    </select>
                  </label>
                )}
                <label>
                  Motivo da decisão
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    minLength={10}
                    maxLength={500}
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || reason.trim().length < 10}
                >
                  {busy
                    ? "Registrando…"
                    : canConfirm
                      ? "Confirmar decisão financeira"
                      : "Registrar proposta"}
                </button>
              </form>
            ) : null}
            <p className="financial-note">
              Nenhum estorno PIX é automático. Confirme a execução e
              reconciliação no Asaas antes de comunicar o encerramento ao
              titular.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
