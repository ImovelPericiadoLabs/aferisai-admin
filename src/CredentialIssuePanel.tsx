import type { Dispatch, RefObject, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { Checkbox } from "./controls";
import {
  applicationPermissionDescription,
  applicationPermissionLabel,
} from "./display-labels";
import { allScopesSelected, toggleAllScopes } from "./credential-scopes";

export function CredentialIssuePanel({
  open,
  panelRef,
  busy,
  error,
  formError,
  name,
  expiresInDays,
  issueReason,
  availableScopes,
  selectedScopes,
  permissionDescriptions,
  onName,
  onExpiresInDays,
  onIssueReason,
  onSelectedScopes,
  onFormError,
  onSubmit,
  onClose,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  busy: boolean;
  error: string;
  formError: string;
  name: string;
  expiresInDays: number;
  issueReason: string;
  availableScopes: string[];
  selectedScopes: string[];
  permissionDescriptions: Record<string, string>;
  onName: (value: string) => void;
  onExpiresInDays: (value: number) => void;
  onIssueReason: (value: string) => void;
  onSelectedScopes: Dispatch<SetStateAction<string[]>>;
  onFormError: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <>
      {open && <div className="detail-panel-overlay" onClick={onClose} />}
      <aside
        ref={panelRef}
        className={`detail-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cred-form-title"
        aria-hidden={!open}
      >
        {open && (
          <>
            <div className="detail-panel-header">
              <div>
                <h2 className="rules-panel-title" id="cred-form-title">
                  Emitir credencial
                </h2>
                <p className="rules-panel-sub">
                  O segredo completo aparece uma única vez.
                </p>
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
            <form
              id="cred-issue-form"
              className="detail-panel-body"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              {(formError || error) && (
                <div className="alert alert-danger form-alert" role="alert">
                  {formError || error}
                </div>
              )}
              <fieldset className="form-section">
                <legend className="form-section-title">Identificação</legend>
                <div className="form-field">
                  <label className="form-field-label" htmlFor="credential-name">
                    Nome da credencial
                  </label>
                  <input
                    id="credential-name"
                    className="input"
                    value={name}
                    maxLength={80}
                    placeholder="Ex.: Sistema de produção"
                    onChange={(event) => {
                      onName(event.target.value);
                      onFormError("");
                    }}
                    required
                  />
                  <span className="form-hint">
                    Identifique o sistema que vai usar esta credencial.
                  </span>
                </div>
                <div className="form-field">
                  <label
                    className="form-field-label"
                    htmlFor="credential-expiry"
                  >
                    Validade
                  </label>
                  <select
                    id="credential-expiry"
                    className="input"
                    value={expiresInDays}
                    onChange={(event) =>
                      onExpiresInDays(Number(event.target.value))
                    }
                  >
                    <option value={30}>30 dias</option>
                    <option value={90}>90 dias</option>
                    <option value={180}>180 dias</option>
                  </select>
                </div>
              </fieldset>
              <fieldset className="form-section">
                <legend className="form-section-title">
                  <span>Permissões</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-pressed={allScopesSelected(
                      availableScopes,
                      selectedScopes,
                    )}
                    onClick={() => {
                      onSelectedScopes((current) =>
                        toggleAllScopes(availableScopes, current),
                      );
                      onFormError("");
                    }}
                    disabled={busy || availableScopes.length === 0}
                  >
                    {allScopesSelected(availableScopes, selectedScopes)
                      ? "Limpar seleção"
                      : "Selecionar todas"}
                  </button>
                </legend>
                <span className="form-hint">
                  Selecione os acessos que esta credencial poderá usar. A
                  seleção total inclui apenas permissões já concedidas à
                  aplicação.
                </span>
                {availableScopes.map((scope) => (
                  <Checkbox
                    key={scope}
                    id={`cred-scope-${scope}`}
                    label={applicationPermissionLabel(scope)}
                    description={applicationPermissionDescription(
                      scope,
                      permissionDescriptions[scope],
                    )}
                    checked={selectedScopes.includes(scope)}
                    onChange={(checked) => {
                      onSelectedScopes((current) =>
                        checked
                          ? [...current, scope]
                          : current.filter((item) => item !== scope),
                      );
                      onFormError("");
                    }}
                  />
                ))}
              </fieldset>
              <fieldset className="form-section">
                <legend className="form-section-title">Motivo</legend>
                <div className="form-field">
                  <label
                    className="form-field-label"
                    htmlFor="credential-reason"
                  >
                    Motivo da emissão (opcional)
                  </label>
                  <textarea
                    id="credential-reason"
                    className="input"
                    rows={3}
                    maxLength={500}
                    value={issueReason}
                    placeholder="Ex.: Sistema de produção do ERP"
                    onChange={(event) => onIssueReason(event.target.value)}
                  />
                  <span className="form-hint">
                    Fica na trilha de auditoria. Sem motivo, o registro usa a
                    finalidade padrão.
                  </span>
                </div>
              </fieldset>
            </form>
            <div className="detail-panel-footer">
              <button
                className="btn btn-primary btn-md"
                type="submit"
                form="cred-issue-form"
                disabled={busy || !name.trim() || selectedScopes.length === 0}
              >
                {busy ? "Emitindo…" : "Emitir credencial"}
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
          </>
        )}
      </aside>
    </>,
    document.body,
  );
}
