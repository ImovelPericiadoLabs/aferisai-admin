import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ApiError, inviteTeamMember, type TeamRoleName } from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import { teamRoleLabel } from "./display-labels";
import {
  TEAM_ROLE_OPTIONS,
  validateManagementReason,
} from "./management-model";
import { RolePicker } from "./RolePicker";
import { useDialogFocus } from "./useDialogFocus";
import type { ToastKind } from "./useToast";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TeamInvite({
  csrf,
  onUnauthorized,
  onToast,
}: {
  csrf: string;
  onUnauthorized: () => void;
  onToast: (message: string, tone: ToastKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [editable, setEditable] = useState(false);
  const [role, setRole] = useState<TeamRoleName | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reasonCheck = validateManagementReason(reason);

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirming(false);
    setError("");
  }

  useDialogFocus(open && !confirming, panelRef, close, {
    returnFocus: () => trigger.current,
  });

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim()))
      return setError("Informe um e-mail válido, como nome@empresa.com.br.");
    if (!role) return setError("Escolha o papel da pessoa.");
    if (!reasonCheck.ok) return setError(reasonCheck.message);
    setError("");
    setConfirming(true);
  }

  async function send() {
    if (!role) return;
    setBusy(true);
    try {
      await inviteTeamMember(email, role, reason, csrf);
      setOpen(false);
      setEmail("");
      setEditable(false);
      setRole(null);
      setReason("");
      onToast(
        "Convite enviado por e-mail. O link vale por 24 horas e a pessoa define a senha e o autenticador.",
        "success",
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? `${cause.detail} Confira com a pessoa antes de convidar de novo: um envio incerto não é repetido automaticamente.`
            : "Não foi possível confirmar o envio do convite.",
        );
    } finally {
      setConfirming(false);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="btn btn-primary btn-md"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Convidar membro
      </button>
      {createPortal(
        <>
          {open && <div className="detail-panel-overlay" onClick={close} />}
          <aside
            ref={panelRef}
            className={`detail-panel${open ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-invite-title"
            aria-hidden={!open}
          >
            {open && (
              <form
                noValidate
                autoComplete="off"
                className="people-invite"
                onSubmit={review}
              >
                <div className="detail-panel-header">
                  <div>
                    <h2 className="rules-panel-title" id="team-invite-title">
                      Convidar membro da equipe
                    </h2>
                    <p className="rules-panel-sub">
                      A pessoa cria a senha e ativa o autenticador antes de
                      entrar.
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Fechar"
                    disabled={busy}
                    onClick={close}
                  >
                    ✕
                  </button>
                </div>
                <div className="detail-panel-body">
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="form-field">
                    <label
                      className="form-field-label"
                      htmlFor="team-invite-email"
                    >
                      E-mail
                    </label>
                    <input
                      id="team-invite-email"
                      className="input"
                      name="team-contact"
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      readOnly={!editable}
                      onFocus={() => setEditable(true)}
                      value={email}
                      disabled={busy}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <RolePicker<TeamRoleName>
                    label="Papel"
                    value={role}
                    options={TEAM_ROLE_OPTIONS}
                    disabled={busy}
                    onChange={setRole}
                  />
                  <div className="form-field">
                    <label
                      className="form-field-label"
                      htmlFor="team-invite-reason"
                    >
                      Motivo da concessão
                    </label>
                    <textarea
                      id="team-invite-reason"
                      className="input"
                      value={reason}
                      disabled={busy}
                      onChange={(event) => setReason(event.target.value)}
                    />
                    <span className="form-hint">
                      Fica na trilha de auditoria (5 a 500 caracteres).
                    </span>
                  </div>
                </div>
                <div className="detail-panel-footer">
                  <button className="btn btn-primary btn-md" disabled={busy}>
                    Revisar convite
                  </button>
                  <button
                    className="btn btn-ghost btn-md"
                    type="button"
                    disabled={busy}
                    onClick={close}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </aside>
        </>,
        document.body,
      )}
      <ConfirmDialog
        open={confirming}
        title="Enviar convite de acesso à equipe?"
        description="O convite é enviado agora por e-mail e vale por 24 horas. Confira o endereço e o papel: se estiverem errados, outra pessoa pode receber o acesso."
        details={[
          { label: "Enviar para", value: email.trim() },
          { label: "Papel", value: teamRoleLabel(role) },
        ]}
        confirmLabel="Enviar convite"
        busy={busy}
        onConfirm={() => void send()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
