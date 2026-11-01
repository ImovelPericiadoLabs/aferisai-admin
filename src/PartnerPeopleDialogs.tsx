import type { PartnerPerson, PartnerRole } from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { actionCopy } from "./partner-people-copy";
import type { PersonAction } from "./partner-people-model";
import { roleLabel } from "./partner-roles";
import { RolePicker } from "./RolePicker";

export function PartnerPeopleDialogs({
  organizationName,
  busy,
  inviteConfirm,
  inviteEmail,
  inviteRole,
  pending,
  newRole,
  onSendInvite,
  onCancelInvite,
  onConfirmAction,
  onCancelAction,
  onNewRole,
}: {
  organizationName: string;
  busy: boolean;
  inviteConfirm: boolean;
  inviteEmail: string;
  inviteRole: PartnerRole | null;
  pending: { action: PersonAction; person: PartnerPerson } | null;
  newRole: PartnerRole | null;
  onSendInvite: () => void;
  onCancelInvite: () => void;
  onConfirmAction: (reason: string) => void;
  onCancelAction: () => void;
  onNewRole: (role: PartnerRole) => void;
}) {
  const copy = pending ? actionCopy[pending.action] : null;

  return (
    <>
      <ConfirmDialog
        open={inviteConfirm}
        title="Enviar convite de acesso?"
        description="O convite será enviado agora por e-mail e o link vale por 24 horas. Confira o endereço: se estiver errado, outra pessoa receberá o acesso."
        details={[
          { label: "Parceria", value: organizationName },
          { label: "Enviar para", value: inviteEmail.trim() },
          { label: "Papel", value: roleLabel(inviteRole) },
        ]}
        confirmLabel="Enviar convite"
        busy={busy}
        onConfirm={() => onSendInvite()}
        onCancel={() => onCancelInvite()}
      />
      <ConfirmDialog
        open={pending !== null}
        tone={copy?.danger ? "danger" : "primary"}
        title={copy?.title ?? ""}
        description={copy?.description}
        details={
          pending
            ? [
                { label: "Pessoa", value: pending.person.email },
                { label: "Parceria", value: organizationName },
              ]
            : []
        }
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 3,
          max: 500,
        }}
        confirmDisabled={
          pending?.action === "change-role" &&
          (newRole === null || newRole === pending.person.role)
        }
        confirmLabel={copy?.confirm ?? ""}
        busy={busy}
        onConfirm={(reason) => onConfirmAction(reason)}
        onCancel={() => onCancelAction()}
      >
        {pending?.action === "change-role" && (
          <RolePicker
            label={`Novo papel (atual: ${roleLabel(pending.person.role)})`}
            value={newRole ?? pending.person.role}
            disabled={busy}
            onChange={onNewRole}
          />
        )}
      </ConfirmDialog>
    </>
  );
}
