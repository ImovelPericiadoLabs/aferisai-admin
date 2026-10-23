import { useState } from "react";
import brazilMap from "@svg-maps/brazil";
import "./dashboard-map.css";

type StateShape = { id: string; name: string; path: string };
const states = brazilMap.locations as StateShape[];

export function DashboardMapPreview() {
  const [selected, setSelected] = useState<StateShape | null>(null);
  return (
    <section className="dash-map-preview" aria-labelledby="dash-map-title">
      <header>
        <div>
          <p className="dash-eyebrow">PRÉVIA DE VISUALIZAÇÃO</p>
          <h2 id="dash-map-title">Mapa por UF</h2>
          <p>
            Interface geográfica preparada para uma métrica futura com UF
            validada.
          </p>
        </div>
        <span className="dash-map-badge">
          <span aria-hidden="true">◇</span> Dados de demonstração
        </span>
      </header>
      <div className="dash-map-content">
        <svg
          viewBox={brazilMap.viewBox}
          role="group"
          aria-label="Mapa real dos estados do Brasil com intensidade fictícia, apenas para demonstrar a interface"
          className="dash-map-svg"
        >
          {states.map((state, index) => (
            <g
              key={state.id}
              className={`dash-map-state dash-map-tone-${(index % 3) + 1}`}
              tabIndex={0}
              role="button"
              aria-label={`${state.name}, intensidade ilustrativa`}
              onFocus={() => setSelected(state)}
              onMouseEnter={() => setSelected(state)}
              onClick={() => setSelected(state)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(state);
                }
              }}
            >
              <path d={state.path} />
            </g>
          ))}
        </svg>
        <div className="dash-map-side">
          <div className="dash-map-selection" aria-live="polite">
            <span>ESTADO SELECIONADO</span>
            <strong>{selected ? selected.name : "Selecione uma UF"}</strong>
            <p>
              {selected
                ? "Visualização demonstrativa, sem contagem de pedidos."
                : "Toque, clique ou use Tab para explorar o mapa."}
            </p>
          </div>
          <div className="dash-map-legend">
            <strong>Escala ilustrativa</strong>
            <span>
              <i className="dash-map-tone-1" />
              Baixa
            </span>
            <span>
              <i className="dash-map-tone-2" />
              Média
            </span>
            <span>
              <i className="dash-map-tone-3" />
              Alta
            </span>
          </div>
          <details>
            <summary>Definição do futuro relatório</summary>
            <p>
              O mapa exigirá UF confiável associada a cada pedido e uma métrica
              aprovada para o período e escopo do ator. As cores atuais são
              fictícias e não representam atividade AferisAI.
            </p>
          </details>
        </div>
      </div>
      <p className="dash-map-credit">
        Base cartográfica:{" "}
        <a
          href="https://github.com/VictorCazanave/svg-maps/tree/master/packages/brazil"
          target="_blank"
          rel="noreferrer"
        >
          SVG Maps Brazil
        </a>{" "}
        (CC BY 4.0).
      </p>
    </section>
  );
}
