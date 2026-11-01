import { createPortal } from "react-dom";
import type { FormEvent, RefObject } from "react";
import type { RegistrySupplierAccount } from "./api";
import { SupplierCreateFields } from "./SupplierCreateFields";
import type { SetSupplierField } from "./supplier-field-types";
import type { SupplierErrors, SupplierForm } from "./supplier-model";

export function SupplierCreatePanel({
  creating,
  panelRef,
  form,
  busy,
  submitted,
  errors,
  formError,
  portalAccounts,
  set,
  onClose,
  onSubmit,
}: {
  creating: boolean;
  panelRef: RefObject<HTMLElement | null>;
  form: SupplierForm;
  busy: boolean;
  submitted: boolean;
  errors: SupplierErrors;
  formError: string;
  portalAccounts: RegistrySupplierAccount[];
  set: SetSupplierField;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return createPortal(
    <>
      {creating && <div className="detail-panel-overlay" onClick={onClose} />}
      <aside
        ref={panelRef}
        className={`detail-panel detail-panel-wide${creating ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-form-title"
        aria-hidden={!creating}
      >
        {creating && (
          <form
            noValidate
            className="sup-form"
            autoComplete="off"
            onSubmit={(event) => onSubmit(event)}
          >
            <div className="detail-panel-header">
              <div>
                <h2 className="prov-title" id="supplier-form-title">
                  Nova conta de fornecedor
                </h2>
                <p className="prov-sub">
                  Nasce em rascunho e cifrada. Ative depois de conferir.
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                aria-label="Fechar"
                disabled={busy}
                onClick={onClose}
              >
                ✕
              </button>
            </div>
            <SupplierCreateFields
              form={form}
              busy={busy}
              submitted={submitted}
              errors={errors}
              formError={formError}
              portalAccounts={portalAccounts}
              set={set}
            />
            <div className="detail-panel-footer">
              <button className="btn btn-primary btn-md" disabled={busy}>
                {busy ? "Cadastrando…" : "Cadastrar em rascunho"}
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
    </>,
    document.body,
  );
}
