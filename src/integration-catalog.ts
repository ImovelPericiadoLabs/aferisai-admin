/**
 * Reference data for the integration map. Facts come from reading aferis-backend
 * (see docs/implementation/permission-map.md); "proposed" items are product
 * proposals, never presented as existing. Paths are relative to the backend repo.
 */
export type CatalogStatus = "implemented" | "partial" | "proposed";

export const statusLabel: Record<CatalogStatus, string> = {
  implemented: "Implementado",
  partial: "Parcial",
  proposed: "Proposta",
};

export type IntegrationMode = {
  id: string;
  name: string;
  actor: string;
  auth: string;
  permissions: string;
  status: CatalogStatus;
  note: string;
  source: string;
};

export type PermissionEntry = {
  code: string;
  title: string;
  status: CatalogStatus;
  grantedByDefault: boolean;
  unlocks: string;
  sensitive: boolean;
  source: string;
};

export type EventEntry = {
  name: string;
  direction: "saída" | "entrada";
  status: CatalogStatus;
  note: string;
  source: string;
};

export type MetricEntry = {
  name: string;
  status: CatalogStatus;
  scope: string;
  note: string;
};

export type GapEntry = {
  id: string;
  title: string;
  effect: string;
  source: string;
};

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
    permissions: "analysis:read, analysis:submit:upload",
    status: "implemented",
    note: "Fora do OpenAPI público. URIs de retorno só pela equipe.",
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

export const permissions: PermissionEntry[] = [
  {
    code: "application:read",
    title: "Consultar integração",
    status: "implemented",
    grantedByDefault: true,
    unlocks: "GET /v1/applications/{id} (id, nome e estado)",
    sensitive: false,
    source: "app/integrations/routes.py:284",
  },
  {
    code: "analysis:read",
    title: "Consultar análises",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Listar, estado, resultado e PDF do titular conectado; recebe analysis.completed",
    sensitive: true,
    source: "app/integrations/deps.py:82",
  },
  {
    code: "analysis:submit:upload",
    title: "Enviar arquivo para análise",
    status: "implemented",
    grantedByDefault: false,
    unlocks: "POST /v1/partner/analyses em nome do titular",
    sensitive: true,
    source: "app/integrations/deps.py:98",
  },
  {
    code: "analysis:quote:read",
    title: "Ver cotação",
    status: "proposed",
    grantedByDefault: false,
    unlocks: "Consultar a cotação de uma análise enviada",
    sensitive: false,
    source: "docs/partner-connection-blueprint.md:32",
  },
  {
    code: "payment:create",
    title: "Criar cobrança PIX",
    status: "proposed",
    grantedByDefault: false,
    unlocks: "Gerar a cobrança do titular, com confirmação explícita dele",
    sensitive: true,
    source: "docs/partner-connection-blueprint.md:32",
  },
  {
    code: "registry:create:number",
    title: "Pedir matrícula por número",
    status: "proposed",
    grantedByDefault: false,
    unlocks: "Operação registral por número",
    sensitive: true,
    source: "docs/registry-execution-plan.md:59",
  },
  {
    code: "registry:read",
    title: "Consultar pedidos de matrícula",
    status: "proposed",
    grantedByDefault: false,
    unlocks: "Estado e resultado dos pedidos registrais",
    sensitive: false,
    source: "docs/registry-execution-plan.md:59",
  },
  {
    code: "analysis:original:read",
    title: "Ler documento original",
    status: "proposed",
    grantedByDefault: false,
    unlocks: "Acesso ao arquivo original (separado e de alto risco)",
    sensitive: true,
    source: "docs/partner-connection-blueprint.md:33",
  },
  {
    code: "events:analysis",
    title: "Receber eventos de análise",
    status: "proposed",
    grantedByDefault: false,
    unlocks: "Assinar eventos separadamente de analysis:read",
    sensitive: false,
    source: "docs/partner-connection-blueprint.md:35",
  },
  {
    code: "metrics:read",
    title: "Ler métricas da aplicação",
    status: "proposed",
    grantedByDefault: false,
    unlocks: "Conexões, envios, concluídas e sucesso de webhook",
    sensitive: false,
    source: "docs/pending.md:3496",
  },
  {
    code: "commissions:read",
    title: "Ler extrato de comissões",
    status: "proposed",
    grantedByDefault: false,
    unlocks: "Comissões provisórias, devidas, pagas e estornadas",
    sensitive: true,
    source: "docs/pending.md:3496",
  },
];

export const events: EventEntry[] = [
  {
    name: "analysis.completed",
    direction: "saída",
    status: "implemented",
    note: "Um POST de 10 s, sem reenvio; carrega analysis_request_id e connection_id.",
    source: "app/integrations/models.py:353",
  },
  {
    name: "webhook.test",
    direction: "saída",
    status: "implemented",
    note: "Até 10 por hora por aplicação; um sucesso é pré-requisito para ativar.",
    source: "app/integrations/svc/webhook_tests.py:40",
  },
  {
    name: "PAYMENT_* (11 nomes)",
    direction: "entrada",
    status: "implemented",
    note: "Do Asaas para a Aferis; não é voltado ao parceiro.",
    source: "app/payments/svc/reconciliation.py:30",
  },
  ...[
    "analysis.created",
    "analysis.quote_ready",
    "analysis.failed",
    "analysis.needs_review",
    "payment.received",
    "registry.request.updated",
    "connection.revoked",
    "credential.expiring",
    "commission.owed",
  ].map((name): EventEntry => ({
    name,
    direction: "saída",
    status: "proposed",
    note: "Proposta: evento por categoria, com reenvio e carimbo de tempo.",
    source: "docs/partner-connection-blueprint.md:35",
  })),
];

export const metrics: MetricEntry[] = [
  {
    name: "Entregas de webhook por aplicação",
    status: "implemented",
    scope: "Equipe e parceiro",
    note: "Lista com filtro por estado.",
  },
  {
    name: "Conexões ativas",
    status: "partial",
    scope: "Só equipe",
    note: "Lista, sem contagem.",
  },
  {
    name: "Contadores e séries do painel",
    status: "partial",
    scope: "Global",
    note: "Não filtram por organização nem aplicação.",
  },
  {
    name: "Uso de cupom e link",
    status: "partial",
    scope: "Só administrador",
    note: "Conta cotações, não pagamentos.",
  },
  {
    name: "Comissões e repasses",
    status: "partial",
    scope: "Só financeiro",
    note: "O parceiro não vê o próprio extrato.",
  },
  {
    name: "Análises por aplicação ou conexão",
    status: "proposed",
    scope: "Parceiro",
    note: "O backend não grava a aplicação de origem.",
  },
  {
    name: "Conversão paga de cupom e link",
    status: "proposed",
    scope: "Parceiro",
    note: "Exige contar no pagamento.",
  },
  {
    name: "Extrato de comissão para o parceiro",
    status: "proposed",
    scope: "Parceiro",
    note: "Pendência documentada.",
  },
];

export const gaps: GapEntry[] = [
  {
    id: "no-origin",
    title: "Análise do parceiro não registra aplicação nem conexão de origem",
    effect:
      "Leituras e webhooks cobrem todas as análises do titular; impede métrica por parceiro e comissão de integração.",
    source: "app/analyses/partner_routes.py:209",
  },
  {
    id: "connected-never-applied",
    title: "Política integration/connected nunca é aplicada",
    effect: "Regras de integração podem ser publicadas sem efeito algum.",
    source: "app/pricing/repo/registry.py:283",
  },
  {
    id: "coupon-count",
    title: "Uso do cupom conta na cotação, não no pagamento",
    effect:
      "Cotação abandonada consome o limite; cotação de registro não aceita código.",
    source: "app/pricing/repo/commercial.py:518",
  },
  {
    id: "no-partner-roles",
    title: "Pessoas do parceiro não têm papéis",
    effect: "Todo membro ativo controla credenciais, webhook e entregas.",
    source: "app/partner/models.py:27",
  },
  {
    id: "no-replay-protection",
    title: "Webhook sem carimbo de tempo e sem reenvio",
    effect:
      "O parceiro precisa deduplicar por id; falha transitória perde o evento.",
    source: "app/integrations/svc/webhook_transport.py:17",
  },
  {
    id: "team-read-no-role",
    title: "Duas listas da equipe não checam o papel",
    effect:
      "O financeiro lê conexões e pedidos de registro (com owner_user_id).",
    source: "app/integrations/team_routes.py:54",
  },
];
