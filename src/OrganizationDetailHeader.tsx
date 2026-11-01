import type { OrganizationDetail as Detail } from "./api";

function statusLabel(status: string): string {
  if (status === "active") return "Ativa";
  if (status === "suspended") return "Suspensa";
  return "Estado desconhecido";
}

export function OrganizationDetailHeader({
  detail,
  logoBlobUrl,
  compact,
}: {
  detail: Detail;
  logoBlobUrl: string | null;
  compact: boolean;
}) {
  const activeApplications = detail.applications.filter(
    (item) => item.status === "active",
  ).length;
  return (
    <header
      className="card partner-head"
      data-compact={compact ? "true" : "false"}
    >
      <div className="partner-logo">
        {logoBlobUrl ? (
          <img
            src={logoBlobUrl}
            alt={`Logo de ${detail.name}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span aria-hidden="true">
            {detail.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="partner-head-name">
        <h1 className="page-title" id="detail-title">
          {detail.name}
        </h1>
        <p className="page-subtitle">{detail.slug}</p>
      </div>
      <span
        className={`badge ${detail.status === "active" ? "badge-success" : detail.status === "suspended" ? "badge-warning" : "badge-neutral"}`}
      >
        {statusLabel(detail.status)}
      </span>
      <div className="partner-head-stats" aria-hidden={compact}>
        <dl className="partner-stats">
          <div>
            <dt>Aplicações</dt>
            <dd>{detail.applications.length}</dd>
          </div>
          <div>
            <dt>Ativas</dt>
            <dd>{activeApplications}</dd>
          </div>
          <div>
            <dt>Ações no catálogo</dt>
            <dd>{detail.permissions.length}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
