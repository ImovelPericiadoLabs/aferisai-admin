import { itemOptions, type FormState } from "./commercial-model";

export function CommercialPolicyCoverFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
}) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value });
  }

  const itemKnown = itemOptions.some(
    (option) => option.value === form.itemCode,
  );

  return (
    <fieldset className="form-section">
      <legend className="form-section-title">O que cobre</legend>
      <div className="form-field">
        <label className="form-field-label" htmlFor="policy-source">
          Entrada da consulta
        </label>
        <select
          id="policy-source"
          className="input"
          value={form.source}
          onChange={(event) =>
            set("source", event.target.value as FormState["source"])
          }
        >
          <option value="number">Número da matrícula</option>
          <option value="cnm">Código Nacional de Matrícula</option>
          <option value="address">Endereço</option>
          <option value="upload">Arquivo enviado</option>
        </select>
      </div>
      <div className="form-field">
        <label className="form-field-label" htmlFor="policy-item">
          Item
        </label>
        <select
          id="policy-item"
          className="input"
          value={itemKnown ? form.itemCode : "__other__"}
          required
          onChange={(event) =>
            set(
              "itemCode",
              event.target.value === "__other__" ? "" : event.target.value,
            )
          }
        >
          {itemOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value="__other__">Outro item do catálogo</option>
        </select>
        <span className="form-hint">
          Escolha o documento ou aplique a condição a todos os itens desta
          entrada.
        </span>
      </div>
      {!itemKnown && (
        <div className="form-field">
          <label className="form-field-label" htmlFor="policy-item-code">
            Código técnico do item
          </label>
          <input
            id="policy-item-code"
            className="input"
            value={form.itemCode}
            maxLength={80}
            required
            onChange={(event) => set("itemCode", event.target.value)}
          />
          <span className="form-hint">
            Informe o código fornecido pelo catálogo.
          </span>
        </div>
      )}
    </fieldset>
  );
}
