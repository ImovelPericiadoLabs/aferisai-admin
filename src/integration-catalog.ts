/**
 * Reference data for the integration map. Facts come from reading aferis-backend
 * (see docs/implementation/permission-map.md); "proposed" items are product
 * proposals, never presented as existing. Paths are relative to the backend repo.
 */
import type { IntegrationMode } from "./integration-catalog-types";

export { statusLabel } from "./integration-catalog-types";
export type {
  CatalogStatus,
  EventEntry,
  GapEntry,
  IntegrationMode,
  MetricEntry,
  PermissionEntry,
} from "./integration-catalog-types";
export { permissions } from "./integration-catalog-permissions";
export { events, gaps, metrics } from "./integration-catalog-signals";

export const modes: IntegrationMode[] = [
  {
    id: "application-credentials",
    name: "Credencial de aplicação",
    actor: "Servidor do parceiro",
    auth: "Basic → token de 15 min",
    permissions: "application:read",
    status: "implemented",
    note: "Até 2 credenciais ativas; validade de 30, 90 ou 180 dias.",
    source: "app/integrations/routes.py:128",
  },
  {
    id: "delegated-oauth",
    name: "OAuth delegado (PKCE)",
    actor: "Aplicação em nome do titular",
    auth: "Código + PKCE S256, token de 15 min, sem refresh",
    permissions:
      "analysis:read, analysis:submit:upload, events:analysis, registry:submit, registry:read",
    status: "implemented",
    note: "Fora do OpenAPI público. URIs de retorno só pela equipe. Cada análise registra a aplicação e a conexão de origem.",
    source: "app/integrations/routes.py:73",
  },
  {
    id: "user-connections",
    name: "Conexões do titular",
    actor: "Titular",
    auth: "Código por e-mail + cookie",
    permissions: "Escolhe os escopos por aplicação",
    status: "implemented",
    note: "Uma conexão ativa por titular e aplicação; revogação invalida tokens.",
    source: "app/integrations/user_routes.py:154",
  },
  {
    id: "partner-portal",
    name: "Portal do parceiro",
    actor: "Pessoa do parceiro",
    auth: "Convite, senha e TOTP",
    permissions: "Sem papéis: todo membro ativo controla tudo na organização",
    status: "partial",
    note: "Sem métricas, comissões, cupons ou URIs de retorno.",
    source: "app/partner/routes.py:500",
  },
  {
    id: "webhooks",
    name: "Webhooks de saída",
    actor: "Worker da Aferis",
    auth: "HMAC-SHA256 por endpoint",
    permissions: "Conexão com analysis:read",
    status: "partial",
    note: "Um evento real, um POST sem reenvio, sem carimbo de tempo.",
    source: "workers/lanes/webhook_delivery_worker.py:139",
  },
  {
    id: "promotions",
    name: "Cupom e link",
    actor: "Titular com código",
    auth: "Campo promotion_code na cotação",
    permissions: "—",
    status: "partial",
    note: "Só cotação de análise de arquivo; uso conta na cotação, não no pagamento.",
    source: "app/pricing/svc/quotes.py:141",
  },
  {
    id: "commercial-policies",
    name: "Política comercial por canal",
    actor: "Administrador",
    auth: "—",
    permissions: "—",
    status: "partial",
    note: "O canal integração (connected) pode ser criado, mas nunca é aplicado.",
    source: "app/pricing/repo/registry.py:283",
  },
  {
    id: "partner-api-metrics",
    name: "API de métricas do parceiro",
    actor: "Aplicação ou portal",
    auth: "Escopo metrics:read",
    permissions: "metrics:read, commissions:read, connections:read",
    status: "proposed",
    note: "Hoje o parceiro não tem nenhuma métrica além das próprias entregas.",
    source: "docs/pending.md:3496",
  },
];
