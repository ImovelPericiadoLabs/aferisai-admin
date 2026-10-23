import { EntityPicker } from "./EntityPicker";
import { RadioGroup } from "./controls";
import {
  LIMIT_NOTES,
  resolveOrganization,
  searchOrganizations,
  searchPromotionPolicies,
} from "./lookups";
import type { PromotionFormState } from "./promotion-model";

type Props = {
  form: PromotionFormState;
  onChange: (next: PromotionFormState) => void;
  busy: boolean;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
  onUnauthorized: () => void;
};

export function PromotionForm({
  form,
  onChange,
  busy,
  error,
  onSubmit,
  onClose,
  onUnauthorized,
}: Props) {
  function set<K extends keyof PromotionFormState>(
    key: K,
    value: PromotionFormState[K],
  ) {
    onChange({ ...form, [key]: value });
  }

  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="promo-panel-title">
            Nova promoção
          </h2>
          <p className="rules-panel-sub">
            O código é gerado ao registrar e aparece uma única vez.
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
        id="promo-form"
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
        <fieldset className="form-section">
          <legend className="form-section-title">Quem recebe</legend>
          <EntityPicker
            onUnauthorized={onUnauthorized}
            id="promo-policy"
            label="Regra da promoção"
            placeholder="Buscar regra publicada de promoção"
            required
            hint="Só aparecem regras publicadas do canal promoção."
            emptyMessage="Nenhuma regra de promoção publicada. Crie e publique uma regra antes de criar a promoção."
            value={form.policyVersionId}
            search={searchPromotionPolicies}
            limitNote={LIMIT_NOTES.policies}
            onChange={(id) => set("policyVersionId", id)}
          />
          <EntityPicker
            onUnauthorized={onUnauthorized}
            id="promo-org"
            label="Organização"
            placeholder="Buscar organização pelo nome"
            required
            value={form.organizationId}
            search={searchOrganizations}
            resolve={resolveOrganization}
            onChange={(id) => set("organizationId", id)}
          />
        </fieldset>
        <fieldset className="form-section">
          <legend className="form-section-title">Como é usada</legend>
          <RadioGroup
            name="promo-kind"
            legend="Tipo"
            value={form.kind}
            onChange={(value) => set("kind", value as "coupon" | "link")}
            options={[
              {
                value: "coupon",
                label: "Cupom",
                description: "Código digitado no pedido.",
              },
              {
                value: "link",
                label: "Link",
                description: "Endereço com o código embutido.",
              },
            ]}
          />
          <div className="form-row">
            <div className="form-field">
              <label className="form-field-label" htmlFor="promo-from">
                Início
              </label>
              <input
                id="promo-from"
                className="input"
                type="datetime-local"
                required
                value={form.validFrom}
                onChange={(event) => set("validFrom", event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-field-label" htmlFor="promo-until">
                Fim
              </label>
              <input
                id="promo-until"
                className="input"
                type="datetime-local"
                required
                value={form.validUntil}
                onChange={(event) => set("validUntil", event.target.value)}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="promo-label">
              Rótulo público (opcional)
            </label>
            <input
              id="promo-label"
              className="input"
              maxLength={200}
              value={form.publicLabel}
              placeholder="Ex.: 10% de desconto na primeira consulta"
              onChange={(event) => set("publicLabel", event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="promo-limit">
              Limite de usos
            </label>
            <input
              id="promo-limit"
              className="input"
              inputMode="numeric"
              value={form.useLimit}
              placeholder="Sem limite"
              onChange={(event) => set("useLimit", event.target.value)}
            />
            <span className="form-hint">
              Deixe vazio para não limitar. Número inteiro de 1 em diante.
            </span>
          </div>
        </fieldset>
      </form>
      <div className="detail-panel-footer">
        <button
          className="btn btn-primary btn-md"
          type="submit"
          form="promo-form"
          disabled={busy}
        >
          {busy ? "Gerando…" : "Gerar código"}
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
