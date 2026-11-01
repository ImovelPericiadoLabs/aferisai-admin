import type { DashboardMetrics } from "./api";
import {
  groupSum,
  type DashboardDestination,
  type DashboardGroup,
  type DashboardRole,
} from "./dashboard-model";
import type { DashboardPageProps } from "./dashboard-data";
import { Icon } from "./DashboardIcon";

export function OverviewMetrics({ groups }: { groups: DashboardGroup[] }) {
  return (
    <section
      className="dash-kpi-strip"
      aria-label="Contagens atuais por módulo"
    >
      {groups.map((group) => (
        <div className="dash-kpi-card" key={group.key}>
          <div className="dash-kpi-top">
            <span className={`kpi-icon dash-card-icon-${group.icon}`}>
              <Icon name={group.icon} />
            </span>
            <span className="kpi-label">{group.title}</span>
          </div>
          <strong className="kpi-value">
            {groupSum(group).toLocaleString("pt-BR")}
          </strong>
          <small className="kpi-sub">registros nos estados exibidos</small>
        </div>
      ))}
    </section>
  );
}

export function Attention({
  data,
  role,
  navigate,
}: {
  data: DashboardMetrics;
  role: DashboardRole;
  navigate: DashboardPageProps["navigate"];
}) {
  const items: {
    label: string;
    value: number;
    destination?: DashboardDestination;
  }[] = [];
  if (
    (role === "manager" || role === "administrator") &&
    data.registry_requests
  ) {
    items.push({
      label: "Pedidos registrais pendentes",
      value: data.registry_requests.pending,
      destination: "registry-requests",
    });
    items.push({
      label: "Pedidos registrais com erro ou incertos",
      value: data.registry_requests.error,
      destination: "registry-requests",
    });
  }
  if ((role === "manager" || role === "administrator") && data.analyses)
    items.push({
      label: "Análises com erro",
      value: data.analyses.error,
      destination: "analyses",
    });
  if (role === "financial" && data.payments)
    items.push({
      label: "Pagamentos em revisão",
      value: data.payments.review,
      destination: "financial",
    });
  if (role === "financial" && data.commissions)
    items.push({
      label: "Comissões a repassar",
      value: data.commissions.owed,
      destination: "commissions",
    });
  if (!items.length) return null;
  const active = items.filter((item) => item.value > 0);
  const pendingCount = active.reduce((total, item) => total + item.value, 0);
  return (
    <section className="dash-attention" aria-labelledby="dash-attention-title">
      <div className="dash-attention-head">
        <strong id="dash-attention-title">Pendências da equipe</strong>
        <span className="dash-attention-count">
          {pendingCount.toLocaleString("pt-BR")}{" "}
          {pendingCount === 1 ? "pendência" : "pendências"}
        </span>
      </div>
      {active.length ? (
        <div className="dash-attention-list">
          {active.map((item) =>
            item.destination ? (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.destination!)}
                className="dash-attention-item"
              >
                <span className="dash-attention-dot" aria-hidden="true" />
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString("pt-BR")}</strong>
                <Icon name="arrow" />
              </button>
            ) : (
              <div key={item.label} className="dash-attention-item">
                <span className="dash-attention-dot" aria-hidden="true" />
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString("pt-BR")}</strong>
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="dash-attention-clear">
          Nenhum registro nos estados de pendência disponíveis para seu perfil.
        </p>
      )}
    </section>
  );
}
