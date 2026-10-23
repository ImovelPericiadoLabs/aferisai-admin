import { useEffect, useState } from "react";
import {
  ApiError,
  getApplicationWebhookEndpoint,
  listApplicationWebhookDeliveries,
  listPartnerCredentials,
  type PartnerCredential,
  type WebhookDelivery,
  type WebhookEndpoint,
} from "./api";
import {
  summarizeCredentials,
  summarizeDelivery,
  summarizeEndpoint,
} from "./application-overview-model";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type Loaded = {
  endpoint: WebhookEndpoint | null;
  credentials: PartnerCredential[];
  delivery: WebhookDelivery | null;
};

export function ApplicationOverview({
  applicationId,
  channel,
  grantedCount,
  totalPermissions,
  onOpen,
  onUnauthorized,
}: {
  applicationId: string;
  channel: "team" | "partner";
  grantedCount: number;
  totalPermissions: number;
  onOpen: (tab: "webhooks" | "deliveries" | "credentials" | "access") => void;
  onUnauthorized: () => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [endpoint, credentials, deliveries] = await Promise.all([
          getApplicationWebhookEndpoint(applicationId, channel).catch(
            (cause: unknown) => {
              if (cause instanceof ApiError && cause.status === 404)
                return null;
              throw cause;
            },
          ),
          listPartnerCredentials(applicationId, undefined, channel),
          listApplicationWebhookDeliveries(applicationId, {}, channel),
        ]);
        if (live)
          setData({
            endpoint,
            credentials: credentials.items,
            delivery: deliveries.items[0] ?? null,
          });
      } catch (cause) {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [applicationId, channel, onUnauthorized]);

  if (failed)
    return (
      <div className="alert alert-danger" role="alert">
        Não foi possível carregar o resumo da integração. Use as abas para
        consultar cada área.
      </div>
    );
  if (!data)
    return (
      <div className="rules-skeleton" role="status" aria-label="Carregando">
        {Array.from({ length: 4 }, (_, index) => (
          <span className="skeleton" key={index} />
        ))}
      </div>
    );

  const endpoint = summarizeEndpoint(data.endpoint);
  const credentials = summarizeCredentials(data.credentials);
  const delivery = summarizeDelivery(data.delivery);

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
