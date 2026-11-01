import { useState } from "react";
import { EntityPicker } from "./EntityPicker";
import type { PickerResult } from "./picker-model";

const people = [
  "Cartório Alfa",
  "Imobiliária Beta",
  "Banco Gama",
  "Escritório Delta",
];

async function searchSamples(query: string): Promise<PickerResult> {
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  return {
    options: people
      .filter(
        (name) => !needle || name.toLocaleLowerCase("pt-BR").includes(needle),
      )
      .map((name) => ({ id: name, label: name })),
  };
}

export function DesignGuideFields() {
  const [picked, setPicked] = useState("");

  return (
    <div className="guide-section card">
      <h2>Campos</h2>
      <p>
        Rótulo sempre visível; dica abaixo; seleção por busca no lugar de
        identificadores.
      </p>
      <div className="guide-grid">
        <div className="form-field">
          <label className="form-field-label" htmlFor="g-input">
            Texto
          </label>
          <input id="g-input" className="input" placeholder="Digite aqui" />
          <span className="form-hint">Dica de preenchimento.</span>
        </div>
        <div className="form-field">
          <label className="form-field-label" htmlFor="g-select">
            Seleção
          </label>
          <select id="g-select" className="input" defaultValue="a">
            <option value="a">Opção A</option>
            <option value="b">Opção B</option>
          </select>
        </div>
        <div className="form-field guide-wide">
          <label className="form-field-label" htmlFor="g-area">
            Texto longo
          </label>
          <textarea id="g-area" className="input" rows={3} />
        </div>
        <EntityPicker
          id="g-picker"
          label="Parceiro"
          value={picked}
          search={searchSamples}
          placeholder="Buscar parceiro"
          onChange={(id) => setPicked(id)}
        />
      </div>
    </div>
  );
}
