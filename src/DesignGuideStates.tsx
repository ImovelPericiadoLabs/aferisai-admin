import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function DesignGuideStates() {
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <div className="guide-section card">
        <h2>Estados e confirmação</h2>
        <p>Vazio, erro, carregando, avisos e o diálogo de confirmação.</p>
        <div className="guide-grid">
          <div className="empty-state" role="status">
            <strong>Nada por aqui</strong>
            <span>Explique o que fazer em seguida.</span>
          </div>
          <div className="alert alert-danger" role="alert">
            Não foi possível carregar.
          </div>
          <div className="alert alert-success" role="status">
            Alterações salvas.
          </div>
          <div className="alert" role="note">
            Informação útil e neutra.
          </div>
          <div className="guide-stack" aria-hidden="true">
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
          <div>
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => setConfirm(true)}
            >
              Abrir confirmação
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Remover item de exemplo?"
        description="Esta ação é apenas uma demonstração."
        reason={{ label: "Motivo", min: 10, max: 500 }}
        confirmLabel="Remover"
        tone="danger"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
