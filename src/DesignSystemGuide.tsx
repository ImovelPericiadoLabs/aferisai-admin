import { DesignGuideCode } from "./DesignGuideCode";
import { DesignGuideControls } from "./DesignGuideControls";
import { DesignGuideFields } from "./DesignGuideFields";
import { DesignGuideFiles } from "./DesignGuideFiles";
import { DesignGuideStates } from "./DesignGuideStates";
import "./design-guide.css";

export function DesignSystemGuide() {
  return (
    <section className="page guide" aria-labelledby="guide-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="guide-title">
            Guia do design system
          </h1>
          <p className="page-subtitle">
            Referência viva dos componentes do painel. Visível apenas para
            administradores.
          </p>
        </div>
      </header>

      <div className="guide-section card">
        <h2>Botões e badges</h2>
        <p>Ações usam verbos; estados usam badges com tom semântico.</p>
        <div className="guide-inline">
          <button className="btn btn-primary" type="button">
            Primário
          </button>
          <button className="btn btn-secondary" type="button">
            Secundário
          </button>
          <button className="btn btn-ghost" type="button">
            Discreto
          </button>
          <button className="btn btn-danger" type="button">
            Perigoso
          </button>
          <button className="btn btn-secondary" type="button" disabled>
            Desabilitado
          </button>
        </div>
        <div className="guide-inline">
          <span className="badge badge-success">Ativo</span>
          <span className="badge badge-warning">Atenção</span>
          <span className="badge badge-danger">Erro</span>
          <span className="badge badge-info">Info</span>
          <span className="badge badge-neutral">Rascunho</span>
        </div>
      </div>

      <DesignGuideFields />

      <DesignGuideControls />

      <DesignGuideFiles />

      <DesignGuideCode />

      <DesignGuideStates />
    </section>
  );
}
