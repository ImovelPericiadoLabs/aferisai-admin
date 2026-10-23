import { useCallback, useState } from "react";
import {
  ApiError,
  changeTeamMemberRole,
  changeTeamMemberStatus,
  changeUserStatus,
  listTeamMemberEvents,
  listUserEvents,
  type TeamRoleName,
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

type Dialog = null | "status" | "role";

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

  const blocks =
    kind === "team"
      ? memberBlocks(person, actorId)
      : { role: null, status: null };
  const next = person.status === "active" ? "suspended" : "active";
  const copy = statusCopy(kind === "team" ? "team" : "user", next);

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

  return (
    <>
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
    </>
  );
}
