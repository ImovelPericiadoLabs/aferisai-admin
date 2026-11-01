import type {
  EventEntry,
  GapEntry,
  MetricEntry,
} from "./integration-catalog-types";

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
    status: "partial",
    scope: "Parceiro",
    note: "A origem já é gravada (release 8de00f4); falta o endpoint de métrica.",
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
    id: "connected-never-applied",
    title: "Política integration/connected só vale na cotação de arquivo",
    effect:
      "Desde o PR #35 a cotação de arquivo aplica a política da aplicação conectada; a cotação registral ainda não, e depende da rota delegada e da origem da operação.",
    source: "app/pricing/repo/registry.py:283",
  },
  {
    id: "coupon-count",
    title: "Cupom: falta código na cotação registral e captura de link",
    effect:
      "Desde o PR #35 o uso conta no pagamento, uma vez por intenção. Cotação de registro ainda não aceita código, não gera comissão registral e não há captura de link.",
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
  {
    id: "registry-delegated-missing",
    title: "Não existe rota registral delegada",
    effect:
      "O parceiro não consegue pedir matrícula nem certidão em nome do titular.",
    source: "Informado pela sessão do backend (release 8de00f4)",
  },
  {
    id: "partner-routes-503",
    title: "Rotas parceiras públicas ainda respondem 503 no Nginx",
    effect:
      "A integração por parceiros externos não está liberada em produção.",
    source: "Informado pela sessão do backend (release 8de00f4)",
  },
  {
    id: "real-webhook-unvalidated",
    title: "Entrega real a um endpoint de parceiro ainda não validada",
    effect:
      "O consumidor de webhooks sobe no deploy, mas falta uma entrega de ponta a ponta.",
    source: "Informado pela sessão do backend (release 8de00f4)",
  },
];
