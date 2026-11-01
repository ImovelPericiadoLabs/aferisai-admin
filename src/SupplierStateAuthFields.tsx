import { Field } from "./SupplierFormField";
import type { SetSupplierField } from "./supplier-field-types";
import type { SupplierErrors, SupplierForm } from "./supplier-model";

export function SupplierStateAuthFields({
  form,
  busy,
  submitted,
  errors,
  set,
}: {
  form: SupplierForm;
  busy: boolean;
  submitted: boolean;
  errors: SupplierErrors;
  set: SetSupplierField;
}) {
  return (
    <fieldset className="sup-state-auth">
      <legend>Autenticação estadual para MG (opcional)</legend>
      <p className="form-hint">
        A InfoSimples exige uma autenticação adicional para MG. Use login gov.br
        ou certificado PKCS#12. Os segredos ficam apenas no cofre.
      </p>
      <Field
        id="sup-state-login-cpf"
        label="CPF de login gov.br"
        error={submitted ? errors.stateLoginCpf : undefined}
      >
        <input
          id="sup-state-login-cpf"
          className="input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={11}
          value={form.stateLoginCpf}
          disabled={busy}
          onChange={(event) =>
            set("stateLoginCpf", event.target.value.replace(/\D/g, ""))
          }
        />
      </Field>
      <Field id="sup-state-login-password" label="Senha do login gov.br">
        <input
          id="sup-state-login-password"
          className="input"
          type="password"
          autoComplete="new-password"
          value={form.stateLoginPassword}
          disabled={busy}
          onChange={(event) => set("stateLoginPassword", event.target.value)}
        />
      </Field>
      <p className="form-hint">Ou, em vez do par acima:</p>
      <Field
        id="sup-state-pkcs12"
        label="Certificado PKCS#12"
        error={submitted ? errors.statePkcs12Cert : undefined}
      >
        <textarea
          id="sup-state-pkcs12"
          className="input"
          rows={3}
          autoComplete="off"
          value={form.statePkcs12Cert}
          disabled={busy}
          onChange={(event) => set("statePkcs12Cert", event.target.value)}
        />
      </Field>
      <Field id="sup-state-pkcs12-password" label="Senha do certificado">
        <input
          id="sup-state-pkcs12-password"
          className="input"
          type="password"
          autoComplete="new-password"
          value={form.statePkcs12Password}
          disabled={busy}
          onChange={(event) => set("statePkcs12Password", event.target.value)}
        />
      </Field>
    </fieldset>
  );
}
