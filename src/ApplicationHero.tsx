import type { ReactNode } from "react";
import {
  summarizeCredentials,
  summarizeDeliveries,
} from "./application-overview-model";
import type { ApplicationSnapshot } from "./useApplicationSnapshot";
import { useCountUp } from "./useCountUp";

function Metric({
  label,
  value,
  suffix = "",
  hint,
  decimals = 0,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  hint: string;
  decimals?: number;
}) {
  const shown = useCountUp(value ?? 0);
  return (
    <div className="appws-metric">
      <dt>{label}</dt>
      <dd>
        {value === null
          ? "—"
          : `${shown.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`}
      </dd>
      <small>{hint}</small>
    </div>
  );
}

export function ApplicationHero({
  name,
  active,
  description,
  snapshot,
  failed,
  grantedCount,
  totalPermissions,
  canManage,
  switcher,
}: {
  name: string;
  active: boolean;
  description: string;
  snapshot: ApplicationSnapshot | null;
  failed: boolean;
  grantedCount: number;
  totalPermissions: number;
  canManage: boolean;
  switcher: ReactNode;
}) {
  const deliveries = snapshot ? summarizeDeliveries(snapshot.deliveries) : null;
  const credentials = snapshot
    ? summarizeCredentials(snapshot.credentials)
    : null;

  return (
    <header className="appws-hero card">
      <div className="appws-hero-top">
        <div>
          <h2 className="appws-title">{name}</h2>
          <p className="page-subtitle">{description}</p>
        </div>
        <div className="appws-hero-side">
          {switcher}
          <span
            className={`badge ${active ? "badge-success" : "badge-warning"}`}
          >
            {active ? "Ativa" : "Suspensa"}
          </span>
        </div>
      </div>
      {canManage && (
        <>
          {failed && (
            <p className="form-hint" role="status">
              Não foi possível carregar as métricas agora.
            </p>
          )}
          <dl className="appws-metrics" aria-label="Métricas da integração">
            <Metric
              label="Entregas recentes"
              value={deliveries ? deliveries.total : null}
              hint="Últimas registradas"
            />
            <Metric
              label="Taxa de sucesso"
              value={
                deliveries && deliveries.successRate !== null
                  ? Math.round(deliveries.successRate * 100)
                  : null
              }
              suffix="%"
              hint="Entre as decididas"
            />
            <Metric
              label="Latência média"
              value={deliveries ? deliveries.averageMs : null}
              suffix=" ms"
              hint="Nas últimas entregas"
            />
            <Metric
              label="Credenciais ativas"
              value={credentials ? credentials.active : null}
              suffix=" de 2"
              hint="Limite por aplicação"
            />
            <Metric
              label="Permissões"
              value={grantedCount}
              suffix={` de ${totalPermissions}`}
              hint="Concedidas"
            />
          </dl>
        </>
      )}
    </header>
  );
}
