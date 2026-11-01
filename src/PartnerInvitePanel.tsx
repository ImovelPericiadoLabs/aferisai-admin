import type { RefObject } from "react";
import type { FormEvent } from "react";
import type { PartnerRole } from "./api";
import { RolePicker } from "./RolePicker";

export function PartnerInvitePanel({
  open,
  panelRef,
  organizationName,
  email,
  editable,
  role,
  error,
  busy,
  onClose,
  onSubmit,
  onFocusEmail,
  onEmail,
  onRole,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  organizationName: string;
  email: string;
  editable: boolean;
  role: PartnerRole | null;
  error: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFocusEmail: () => void;
  onEmail: (value: string) => void;
  onRole: (role: PartnerRole) => void;
}) {
  return (
    <>
      {open && <div className="detail-panel-overlay" onClick={onClose} />}
      <aside
        ref={panelRef}
        className={`detail-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-invite-title"
        aria-hidden={!open}
      >
        {open && (
          <form noValidate onSubmit={onSubmit} className="people-invite">
            <div className="detail-panel-header">
              <div>
                <h2 className="rules-panel-title" id="people-invite-title">
                  Convidar pessoa
                </h2>
                <p className="rules-panel-sub">{organizationName}</p>
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
              <div className="form-field">
                <label
                  className="form-field-label"
                  htmlFor="partner-invite-email"
                >
                  E-mail da pessoa
                </label>
                <input
                  id="partner-invite-email"
                  className="input"
                  name="responsible-contact"
                  type="text"
                  inputMode="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  readOnly={!editable}
                  onFocus={() => onFocusEmail()}
                  value={email}
                  onChange={(event) => onEmail(event.target.value)}
                />
                <span className="form-hint">
                  Ela cria a senha e ativa o autenticador antes de entrar.
                </span>
              </div>
              <RolePicker
                label="Papel na parceria"
                value={role}
                disabled={busy}
                onChange={onRole}
              />
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
            </div>
            <div className="detail-panel-footer">
              <button
                className="btn btn-primary btn-md"
                disabled={busy || !email.trim() || !role}
              >
                Enviar convite
              </button>
              <button
                className="btn btn-ghost btn-md"
                type="button"
                disabled={busy}
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}
