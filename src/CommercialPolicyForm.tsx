import type { FormState } from "./commercial-model";
import { CommercialPolicyCoverFields } from "./CommercialPolicyCoverFields";
import { CommercialPolicyScopeFields } from "./CommercialPolicyScopeFields";
import { CommercialPolicyTermsFields } from "./CommercialPolicyTermsFields";
import type { OrganizationOption } from "./commercial-policy-form-types";

export type { OrganizationOption } from "./commercial-policy-form-types";

type Props = {
  form: FormState;
  onChange: (next: FormState) => void;
  editing: boolean;
  busy: boolean;
  error: string;
  organizations: OrganizationOption[];
  onSubmit: () => void;
  onClose: () => void;
  onUnauthorized: () => void;
};

export function CommercialPolicyForm({
  form,
  onChange,
  editing,
  busy,
  error,
  organizations,
  onSubmit,
  onClose,
  onUnauthorized,
}: Props) {
  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="rules-panel-title">
            {editing ? "Editar rascunho" : "Nova regra comercial"}
          </h2>
          <p className="rules-panel-sub">
            A regra só passa a valer depois de publicada. Todo registro guarda o
            motivo informado.
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
        id="policy-form"
        className="detail-panel-body"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {error && (
          <div className="alert alert-danger form-alert" role="alert">
            {error}
          </div>
        )}
        <CommercialPolicyScopeFields
          form={form}
          onChange={onChange}
          organizations={organizations}
          onUnauthorized={onUnauthorized}
        />

        <CommercialPolicyCoverFields form={form} onChange={onChange} />

        <CommercialPolicyTermsFields form={form} onChange={onChange} />
      </form>
      <div className="detail-panel-footer">
        <button
          className="btn btn-primary btn-md"
          type="submit"
          form="policy-form"
          disabled={busy}
        >
          {editing ? "Salvar rascunho" : "Registrar rascunho"}
        </button>
        <button
          className="btn btn-ghost btn-md"
          type="button"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </>
  );
}
