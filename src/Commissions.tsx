import { useState } from "react";
import { CommissionEntriesTab } from "./CommissionEntriesTab";
import { CommissionSettlementsTab } from "./CommissionSettlementsTab";
import type { CommissionsView } from "./commissions-model";
import "./commercial-policies.css";

export function Commissions({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [view, setView] = useState<CommissionsView>("entries");

  return (
    <div className="content commercial-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Papel financeiro</p>
          <h1>Comissões</h1>
          <p className="muted">
            Obrigações por item concluído e repasses externos verificados.
          </p>
        </div>
        <span className="pill">Financeiro</span>
      </header>
      <div className="notice" role="note">
        O clique não substitui a evidência de transferência bancária. Registre
        somente após o comprovante externo verificado.
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          className={`button ${view === "entries" ? "primary" : "secondary"}`}
          onClick={() => setView("entries")}
        >
          Obrigações
        </button>
        <button
          type="button"
          className={`button ${view === "settlements" ? "primary" : "secondary"}`}
          onClick={() => setView("settlements")}
        >
          Repasses
        </button>
      </div>
      {view === "entries" ? (
        <CommissionEntriesTab csrf={csrf} onUnauthorized={onUnauthorized} />
      ) : (
        <CommissionSettlementsTab csrf={csrf} onUnauthorized={onUnauthorized} />
      )}
    </div>
  );
}
