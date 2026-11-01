import type { RegistrySupplierAccount, RegistrySupplierKind } from "./api";
import { Field } from "./SupplierFormField";
import { SupplierStateAuthFields } from "./SupplierStateAuthFields";
import type { SetSupplierField } from "./supplier-field-types";
import {
  shortDigest,
  supplierLabel,
  type SupplierErrors,
  type SupplierForm,
} from "./supplier-model";

export function SupplierCreateFields({
  form,
  busy,
  submitted,
  errors,
  formError,
  portalAccounts,
  set,
}: {
  form: SupplierForm;
  busy: boolean;
  submitted: boolean;
  errors: SupplierErrors;
  formError: string;
  portalAccounts: RegistrySupplierAccount[];
  set: SetSupplierField;
}) {
  return (
    <div className="detail-panel-body">
      {formError && (
        <div className="alert alert-danger form-alert" role="alert">
          {formError}
        </div>
      )}
      <Field
        id="sup-label"
        label="Nome interno"
        error={submitted ? errors.label : undefined}
      >
        <input
          id="sup-label"
          className="input"
          autoComplete="off"
          maxLength={120}
          value={form.label}
          disabled={busy}
          onChange={(event) => set("label", event.target.value)}
        />
      </Field>
      <Field id="sup-provider" label="Fornecedor">
        <select
          id="sup-provider"
          className="input"
          value={form.provider}
          disabled={busy}
          onChange={(event) => {
            set("provider", event.target.value as RegistrySupplierKind);
            set("token", "");
          }}
        >
          <option value="onr">{supplierLabel("onr")}</option>
          <option value="infosimples">{supplierLabel("infosimples")}</option>
        </select>
      </Field>
      <Field
        id="sup-email"
        label="Login do portal"
        error={submitted ? errors.email : undefined}
      >
        <input
          id="sup-email"
          className="input"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          value={form.email}
          disabled={busy}
          onChange={(event) => set("email", event.target.value)}
        />
      </Field>
      <Field
        id="sup-password"
        label="Senha"
        error={submitted ? errors.password : undefined}
      >
        <input
          id="sup-password"
          className="input"
          type="password"
          autoComplete="new-password"
          value={form.password}
          disabled={busy}
          onChange={(event) => set("password", event.target.value)}
        />
      </Field>
      {form.provider === "infosimples" && (
        <>
          <Field
            id="sup-token"
            label="Token da InfoSimples"
            error={submitted ? errors.token : undefined}
          >
            <input
              id="sup-token"
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.token}
              disabled={busy}
              onChange={(event) => set("token", event.target.value)}
            />
          </Field>
          <Field
            id="sup-digest"
            label="Conta RI Digital vinculada"
            hint={
              portalAccounts.length
                ? "Selecione a conta RI Digital usada com esta credencial. O vínculo identifica os pedidos e custos registrais."
                : "Cadastre primeiro a conta RI Digital. Se ela não aparecer aqui, carregue mais resultados na lista de fornecedores."
            }
            error={submitted ? errors.portalDigest : undefined}
          >
            <select
              id="sup-digest"
              className="input"
              value={form.portalDigest}
              disabled={busy}
              onChange={(event) => set("portalDigest", event.target.value)}
            >
              <option value="">Selecione uma conta RI Digital</option>
              {portalAccounts.map((account) => (
                <option key={account.id} value={account.account_binding_sha256}>
                  {account.label} ·{" "}
                  {shortDigest(account.account_binding_sha256)}
                </option>
              ))}
            </select>
          </Field>
          <SupplierStateAuthFields
            form={form}
            busy={busy}
            submitted={submitted}
            errors={errors}
            set={set}
          />
        </>
      )}
      <Field
        id="sup-reason"
        label="Motivo do cadastro"
        hint="Fica na trilha de auditoria (10 a 500 caracteres)."
        error={submitted ? errors.reason : undefined}
      >
        <textarea
          id="sup-reason"
          className="input"
          value={form.reason}
          disabled={busy}
          onChange={(event) => set("reason", event.target.value)}
        />
      </Field>
      <p className="form-hint">
        Os segredos são enviados uma vez, não ficam salvos no navegador e não
        aparecem depois. Não os inclua no motivo.
      </p>
    </div>
  );
}
