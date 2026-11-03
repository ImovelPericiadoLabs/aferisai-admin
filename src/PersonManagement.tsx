import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  changeTeamMemberRole,
  changeTeamMemberStatus,
  changeUserStatus,
  deleteUserAccount,
  getUserOverview,
  grantUserCredits,
  listTeamMemberEvents,
  listUserEvents,
  type TeamRoleName,
  type UserOverview,
} from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { teamRoleLabel } from "./display-labels";
import { ManagementHistory } from "./ManagementHistory";
import {
  TEAM_ROLE_OPTIONS,
  memberBlocks,
  statusCopy,
} from "./management-model";
import type { Person } from "./people-model";
import { RolePicker } from "./RolePicker";
import type { ToastKind } from "./useToast";

type Dialog = null | "status" | "role" | "credits" | "delete";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value))
    : "—";

function parseCents(value: string): number | null {
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value.replace(/\s/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500_000) return null;
  return Math.round(parsed * 100);
}

function Overview({ overview }: { overview: UserOverview }) {
  return (
    <div className="pm-overview">
      <div className="pm-kpis">
        <div>
          <span>Saldo</span>
          <strong>{money(overview.credits.balance_cents)}</strong>
        </div>
        <div>
          <span>Pedidos</span>
          <strong>{overview.registry_requests.length}</strong>
        </div>
        <div>
          <span>Análises</span>
          <strong>{overview.analyses.length}</strong>
        </div>
        <div>
          <span>Pagamentos</span>
          <strong>{overview.payments.length}</strong>
        </div>
      </div>
      <p className="form-hint">
        Último acesso: {date(overview.account.last_login_at)}. Credenciais,
        documentos e dados financeiros criptografados não são expostos neste
        panorama.
      </p>
      <OverviewList
        title="Pedidos registrais"
        empty="Nenhum pedido registral."
        items={overview.registry_requests.map((item) => ({
          key: item.id,
          title: item.product,
          detail: `${item.source} · ${item.item_count} item(ns) · ${date(item.created_at)}`,
          badge: item.status,
        }))}
      />
      <OverviewList
        title="Análises"
        empty="Nenhuma análise."
        items={overview.analyses.map((item) => ({
          key: item.id,
          title: item.source,
          detail: `${item.status}${item.work_status ? ` · ${item.work_status}` : ""} · ${date(item.created_at)}`,
        }))}
      />
      <OverviewList
        title="Pagamentos"
        empty="Nenhum pagamento."
        items={overview.payments.map((item) => ({
          key: item.id,
          title: money(item.amount_cents),
          detail: `${item.funding_source} · ${item.payment_method} · ${item.status} · ${date(item.created_at)}`,
        }))}
      />
      <OverviewList
        title="Conexão Jetimob"
        empty="Nenhuma tentativa de conexão registrada."
        items={overview.jetimob_oauth_events.map((item) => ({
          key: item.id,
          title: item.event_type,
          detail: `${item.has_code ? "code recebido" : "sem code"} · ${item.has_state ? "state recebido" : "sem state"} · ${date(item.created_at)}${item.request_id ? ` · ${item.request_id}` : ""}`,
        }))}
      />
      <OverviewList
        title="Movimentações de crédito"
        empty="Nenhuma movimentação."
        items={overview.credits.movements.map((item) => ({
          key: item.id,
          title: `${item.delta_cents < 0 ? "−" : "+"}${money(Math.abs(item.delta_cents))}`,
          detail: `${item.kind} · ${date(item.created_at)} · ${item.reason}`,
          tone: item.delta_cents < 0 ? "negative" : "positive",
        }))}
      />
      {Object.values(overview.truncated).some(Boolean) && (
        <p className="form-hint">
          Algumas listas estão limitadas aos 50 registros mais recentes.
        </p>
      )}
    </div>
  );
}

function OverviewList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: {
    key: string;
    title: string;
    detail: string;
    badge?: string;
    tone?: "negative" | "positive";
  }[];
}) {
  return (
    <section className="pm-overview-section">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="people-note">{empty}</p>
      ) : (
        <ul className="pm-record-list">
          {items.map((item) => (
            <li key={item.key}>
              <div>
                <strong
                  className={
                    item.tone === "negative"
                      ? "pm-negative"
                      : item.tone === "positive"
                        ? "pm-positive"
                        : undefined
                  }
                >
                  {item.title}
                </strong>
                <small>{item.detail}</small>
              </div>
              {item.badge && (
                <span className="badge badge-neutral">{item.badge}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PersonManagement({
  kind,
  person,
  csrf,
  actorId,
  isAdmin,
  onChanged,
  onUnauthorized,
  onToast,
}: {
  kind: "user" | "team";
  person: Person;
  csrf: string;
  actorId: string;
  isAdmin: boolean;
  onChanged: (change: Partial<Pick<Person, "status" | "role">>) => void;
  onUnauthorized: () => void;
  onToast: (message: string, tone: ToastKind) => void;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [newRole, setNewRole] = useState<TeamRoleName | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [creditAmount, setCreditAmount] = useState("100,00");
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const blocks =
    kind === "team"
      ? memberBlocks(person, actorId)
      : { role: null, status: null };
  const next = person.status === "active" ? "suspended" : "active";
  const copy = statusCopy(kind === "team" ? "team" : "user", next);

  const loadOverview = useCallback(async () => {
    if (kind !== "user" || !isAdmin) return;
    setOverviewLoading(true);
    setOverviewError("");
    try {
      setOverview(await getUserOverview(person.id));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setOverviewError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível carregar o panorama da conta.",
        );
    } finally {
      setOverviewLoading(false);
    }
  }, [isAdmin, kind, onUnauthorized, person.id]);

  useEffect(() => {
    setOverview(null);
    void loadOverview();
  }, [loadOverview]);

  const loadHistory = useCallback(
    (cursor?: string) =>
      kind === "team"
        ? listTeamMemberEvents(person.id, cursor)
        : listUserEvents(person.id, cursor),
    [kind, person.id],
  );

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    try {
      await action();
      setDialog(null);
      setNewRole(null);
      onToast(success, "success");
    } catch (cause) {
      setDialog(null);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        onToast(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível concluir a ação. Atualize a lista e confira.",
          "error",
        );
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (reason: string) =>
    run(async () => {
      if (kind === "team")
        await changeTeamMemberStatus(person.id, next, reason, csrf);
      else await changeUserStatus(person.id, next, reason, csrf);
      onChanged({ status: next });
    }, copy.success);

  const changeRole = (reason: string) =>
    run(async () => {
      if (!newRole) return;
      await changeTeamMemberRole(person.id, newRole, reason, csrf);
      onChanged({ role: newRole });
    }, "Papel alterado. As sessões da pessoa foram encerradas.");

  const grantCredits = (reason: string) => {
    const amountCents = parseCents(creditAmount);
    if (amountCents === null) {
      onToast("Informe um valor entre R$ 0,01 e R$ 500.000,00.", "error");
      return;
    }
    void run(async () => {
      await grantUserCredits(
        person.id,
        amountCents,
        reason,
        csrf,
        crypto.randomUUID(),
      );
      await loadOverview();
    }, "Créditos adicionados e registrados na trilha financeira.");
  };

  const deleteAccount = (reason: string) =>
    void run(async () => {
      await deleteUserAccount(person.id, reason, csrf);
      onChanged({ status: "deleted" });
      setOverview(null);
    }, "Conta anonimizada. O histórico financeiro foi preservado.");

  return (
    <>
      {kind === "user" && isAdmin && (
        <section className="pm-overview-section pm-account-panorama">
          <div className="pm-section-heading">
            <h4>Panorama da conta</h4>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void loadOverview()}
              disabled={overviewLoading}
            >
              {overviewLoading ? "Carregando…" : "Atualizar"}
            </button>
          </div>
          {overviewError && (
            <p className="alert alert-danger" role="alert">
              {overviewError}
            </p>
          )}
          {overviewLoading && !overview && (
            <p className="people-note">Consultando dados operacionais…</p>
          )}
          {overview && <Overview overview={overview} />}
        </section>
      )}

      {isAdmin ? (
        <div className="pm-actions">
          {kind === "team" && (
            <div className="pm-action">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                aria-haspopup="dialog"
                disabled={blocks.role !== null}
                onClick={() => {
                  setNewRole(null);
                  setDialog("role");
                }}
              >
                Alterar papel
              </button>
              {blocks.role && (
                <small className="form-hint">{blocks.role}</small>
              )}
            </div>
          )}
          {person.status !== "deleted" && (
            <div className="pm-action">
              <button
                type="button"
                className={`btn btn-md ${next === "suspended" ? "btn-ghost-danger" : "btn-secondary"}`}
                aria-haspopup="dialog"
                disabled={blocks.status !== null}
                onClick={() => setDialog("status")}
              >
                {next === "suspended" ? "Suspender acesso" : "Reativar acesso"}
              </button>
              {blocks.status && (
                <small className="form-hint">{blocks.status}</small>
              )}
            </div>
          )}
          {kind === "user" && person.status === "active" && (
            <div className="pm-action">
              <label
                className="form-field-label"
                htmlFor={`credit-amount-${person.id}`}
              >
                Adicionar créditos
              </label>
              <input
                id={`credit-amount-${person.id}`}
                className="input"
                inputMode="decimal"
                value={creditAmount}
                onChange={(event) => setCreditAmount(event.target.value)}
                aria-describedby={`credit-help-${person.id}`}
              />
              <small id={`credit-help-${person.id}`} className="form-hint">
                Use BRL, por exemplo 100,00.
              </small>
              <button
                type="button"
                className="btn btn-secondary btn-md"
                disabled={parseCents(creditAmount) === null}
                onClick={() => setDialog("credits")}
              >
                Revisar concessão
              </button>
            </div>
          )}
          {kind === "user" && person.status !== "deleted" && (
            <div className="pm-action">
              <button
                type="button"
                className="btn btn-ghost-danger btn-md"
                aria-haspopup="dialog"
                onClick={() => setDialog("delete")}
              >
                Anonimizar e excluir acesso
              </button>
              <small className="form-hint">
                Bloqueado se houver saldo, pagamento ou processamento aberto.
              </small>
            </div>
          )}
        </div>
      ) : (
        <p className="people-note">
          Somente administradores suspendem contas
          {kind === "team" ? " ou alteram papéis" : ""}.
        </p>
      )}

      {isAdmin && (
        <div className="pm-history">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-expanded={showHistory}
            onClick={() => setShowHistory((value) => !value)}
          >
            {showHistory ? "Ocultar histórico" : "Ver histórico"}
          </button>
          {showHistory && (
            <ManagementHistory
              key={person.id}
              load={loadHistory}
              onUnauthorized={onUnauthorized}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={dialog === "status"}
        tone={next === "suspended" ? "danger" : "primary"}
        title={copy.title}
        description={copy.description}
        details={[
          { label: "Conta", value: person.email },
          ...(person.role
            ? [{ label: "Papel", value: teamRoleLabel(person.role) }]
            : []),
        ]}
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 5,
          max: 500,
        }}
        confirmLabel={copy.confirm}
        busy={busy}
        onConfirm={(reason) => void changeStatus(reason)}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "role"}
        title="Alterar o papel desta pessoa?"
        description="O novo papel vale na hora. As sessões atuais são encerradas e a pessoa precisa entrar de novo. O último administrador ativo não pode ser rebaixado."
        details={[{ label: "Conta", value: person.email }]}
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 5,
          max: 500,
        }}
        confirmDisabled={newRole === null || newRole === person.role}
        confirmLabel="Alterar papel"
        busy={busy}
        onConfirm={(reason) => void changeRole(reason)}
        onCancel={() => setDialog(null)}
      >
        <RolePicker<TeamRoleName>
          label={`Novo papel (atual: ${teamRoleLabel(person.role)})`}
          value={newRole ?? (person.role as TeamRoleName | undefined) ?? null}
          options={TEAM_ROLE_OPTIONS}
          disabled={busy}
          onChange={setNewRole}
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "credits"}
        title="Confirmar concessão de créditos?"
        description="A concessão entra no saldo na hora, não cria PIX e fica registrada com o motivo informado."
        details={[
          { label: "Conta", value: person.email },
          { label: "Valor", value: money(parseCents(creditAmount) ?? 0) },
        ]}
        reason={{
          label: "Motivo financeiro (mínimo 10 caracteres)",
          min: 10,
          max: 500,
        }}
        confirmLabel="Adicionar créditos"
        busy={busy}
        onConfirm={grantCredits}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        tone="danger"
        title="Anonimizar e excluir o acesso?"
        description="O acesso será revogado e os dados pessoais serão anonimizados. Histórico financeiro e obrigações legais permanecem. A operação é bloqueada se houver saldo, pagamento ou processamento em andamento."
        details={[
          { label: "Conta", value: person.email },
          { label: "Resultado", value: "Status anonimizado" },
        ]}
        reason={{
          label: "Motivo da exclusão administrativa (mínimo 10 caracteres)",
          min: 10,
          max: 500,
        }}
        confirmLabel="Anonimizar conta"
        busy={busy}
        onConfirm={deleteAccount}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
