import type { SiteMaintenancePolicy } from "./api";
import { describeWindow, type MaintenanceState } from "./maintenance-model";
import { formatIso, STATE_VIEW } from "./site-maintenance-view";

export function MaintenanceStatusPanel({
  policy,
  state,
}: {
  policy: SiteMaintenancePolicy;
  state: MaintenanceState;
}) {
  const view = STATE_VIEW[state];
  return (
    <aside className="maint-status" data-state={state}>
      <span className={`badge ${view.tone}`} role="status">
        {view.label}
      </span>
      <h2>{view.headline}</h2>
      <p>{view.detail}</p>
      {policy.enabled && (
        <p className="maint-window">
          {describeWindow(policy.starts_at, policy.ends_at, formatIso)}
        </p>
      )}
      <dl className="maint-facts">
        <div>
          <dt>Modo</dt>
          <dd>
            {policy.mode === "off" && "Disponível"}
            {policy.mode === "restricted" &&
              "Em preparação — consultas e pagamentos bloqueados"}
            {policy.mode === "full" &&
              "Em manutenção — tudo bloqueado para visitantes"}
          </dd>
        </div>
        <div>
          <dt>Continua funcionando</dt>
          <dd>Painel da equipe e conciliação de pagamentos</dd>
        </div>
        <div>
          <dt>Versão da configuração</dt>
          <dd>
            {policy.version}
            {policy.updated_at
              ? ` · salva em ${formatIso(policy.updated_at)}`
              : ""}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
