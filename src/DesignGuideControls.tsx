import { useState } from "react";
import { Checkbox, Disclosure, RadioGroup, Slider, Switch } from "./controls";

export function DesignGuideControls() {
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("a");
  const [on, setOn] = useState(false);
  const [zoom, setZoom] = useState(40);

  return (
    <div className="guide-section card">
      <h2>Controles</h2>
      <p>Caixa, opções, interruptor, bloco recolhível e controle deslizante.</p>
      <div className="guide-grid">
        <div className="guide-stack">
          <Checkbox
            id="g-check"
            label="Receber avisos"
            description="Uma por dia."
            checked={checked}
            onChange={setChecked}
          />
          <Checkbox
            id="g-check-i"
            label="Parcial"
            checked={false}
            indeterminate
            onChange={() => undefined}
          />
          <Checkbox
            id="g-check-d"
            label="Desabilitado"
            checked
            disabled
            onChange={() => undefined}
          />
        </div>
        <RadioGroup
          name="g-radio"
          legend="Frequência"
          value={radio}
          onChange={setRadio}
          options={[
            { value: "a", label: "Diária" },
            { value: "b", label: "Semanal", description: "Segundas-feiras." },
            { value: "c", label: "Mensal", disabled: true },
          ]}
        />
        <div className="guide-stack">
          <Switch
            id="g-switch"
            label="Modo ativo"
            description="Liga e desliga na hora."
            checked={on}
            onChange={setOn}
          />
          <Slider
            id="g-slider"
            label="Zoom"
            value={zoom}
            min={0}
            max={100}
            onChange={setZoom}
            format={(v) => `${v}%`}
          />
        </div>
        <Disclosure title="Detalhes avançados">
          <p className="form-hint">Conteúdo recolhido por padrão.</p>
        </Disclosure>
      </div>
    </div>
  );
}
