import {
  summarizeCredentials,
  summarizeDelivery,
  summarizeEndpoint,
} from "./application-overview-model";
import type { ApplicationSnapshot } from "./useApplicationSnapshot";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function ApplicationOverview({
  snapshot,
  failed,
  grantedCount,
  totalPermissions,
  onOpen,
}: {
  snapshot: ApplicationSnapshot | null;
  failed: boolean;
  grantedCount: number;
  totalPermissions: number;
  onOpen: (tab: "webhooks" | "deliveries" | "credentials" | "access") => void;
}) {
  if (failed)
    return (
      <div className="alert alert-danger" role="alert">
        Não foi possível carregar o resumo da integração. Use as abas para
        consultar cada área.
      </div>
    );
  if (!snapshot)
    return (
      <div className="rules-skeleton" role="status" aria-label="Carregando">
        {Array.from({ length: 4 }, (_, index) => (
          <span className="skeleton" key={index} />
        ))}
      </div>
    );

  const endpoint = summarizeEndpoint(snapshot.endpoint);
  const credentials = summarizeCredentials(snapshot.credentials);
  const delivery = summarizeDelivery(snapshot.deliveries[0] ?? null);

  const rows = [
    {
      title: "Webhook",
      badge: <span className={`badge ${endpoint.tone}`}>{endpoint.label}</span>,
      detail: endpoint.detail,
      action: "Configurar",
      tab: "webhooks" as const,
    },
    {
      title: "Credenciais",
      badge: (
        <span className={`badge ${credentials.tone}`}>{credentials.label}</span>
      ),
      detail:
        credentials.revoked > 0
          ? `${credentials.revoked} revogada${credentials.revoked > 1 ? "s" : ""}`
          : "Cada aplicação pode ter até 2 credenciais ativas.",
      action: "Gerenciar",
      tab: "credentials" as const,
    },
    {
      title: "Última entrega",
      badge: <span className={`badge ${delivery.tone}`}>{delivery.label}</span>,
      detail: delivery.at
        ? dateTime.format(new Date(delivery.at))
        : "Os eventos enviados aparecem aqui.",
      action: "Ver entregas",
      tab: "deliveries" as const,
    },
    {
      title: "Permissões",
      badge: (
        <span className="badge badge-neutral">
          {grantedCount} de {totalPermissions}
        </span>
      ),
      detail: "Ações que esta aplicação pode executar.",
      action: "Ver acessos",
      tab: "access" as const,
    },
  ];

  return (
    <ul className="appws-status-list" aria-label="Resumo da integração">
      {rows.map((row) => (
        <li key={row.title}>
          <div>
            <strong>{row.title}</strong>
            <small>{row.detail}</small>
          </div>
          {row.badge}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onOpen(row.tab)}
          >
            {row.action}
          </button>
        </li>
      ))}
    </ul>
  );
}
