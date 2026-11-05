import type { PermissionEntry } from "./integration-catalog-types";

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
      "Listar, estado, resultado e PDF das análises originadas pela própria aplicação; recebe analysis.completed só da conexão iniciadora",
    sensitive: true,
    source: "app/integrations/deps.py:82",
  },
  {
    code: "analysis:submit:upload",
    title: "Enviar matrícula para análise",
    status: "implemented",
    grantedByDefault: false,
    unlocks: "POST /v1/partner/analyses em nome do titular",
    sensitive: true,
    source: "app/integrations/deps.py:98",
  },
  {
    code: "analysis:quote",
    title: "Consultar preço de arquivo",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Consultar opções e cotar arquivos enviados pela própria aplicação; não cria PIX nem paga automaticamente",
    sensitive: false,
    source: "app/integrations/scopes.py:11",
  },
  {
    code: "analysis:pay",
    title: "Pagar análise por PIX",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Iniciar ou consultar o PIX de uma cotação aprovada da própria análise; o pagador é opcional e pode ser reutilizado",
    sensitive: true,
    source: "app/integrations/scopes.py:16",
  },
  {
    code: "payment:read",
    title: "Consultar pagamento PIX",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Consultar o estado e o QR pendente de um PIX criado pela própria aplicação, sem criar nova cobrança",
    sensitive: true,
    source: "app/integrations/scopes.py:21",
  },
  {
    code: "payment:credits",
    title: "Pagar com créditos",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Debitar uma única vez o saldo confirmado da conta conectada para uma cotação aprovada; não autoriza PIX, cartão ou recarga",
    sensitive: true,
    source: "app/integrations/scopes.py:26",
  },
  {
    code: "registry:submit",
    title: "Solicitar documento registral",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Criar pedido por número, CNM ou endereço em nome do titular; não autoriza cotação, pagamento nem compra automática",
    sensitive: true,
    source: "app/integrations/scopes.py:14",
  },
  {
    code: "registry:read",
    title: "Consultar pedidos registrais",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Consultar só os pedidos registrais iniciados por esta aplicação em nome do titular, sem documento original nem dados de pagamento",
    sensitive: false,
    source: "app/integrations/scopes.py:77",
  },
  {
    code: "registry:quote",
    title: "Consultar preços registrais",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Obter a prévia de custo e cotar pedidos registrais iniciados pela própria aplicação; não autoriza PIX nem compra",
    sensitive: false,
    source: "app/integrations/scopes.py:82",
  },
  {
    code: "registry:preview",
    title: "Consultar prévia registral",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Executar ou consultar a prévia de custo registral de pedidos iniciados pela própria aplicação",
    sensitive: false,
    source: "app/integrations/scopes.py:87",
  },
  {
    code: "certificate:read",
    title: "Consultar certidões disponíveis",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Consultar certidões opcionais disponíveis para uma cotação registral própria",
    sensitive: false,
    source: "app/integrations/scopes.py:92",
  },
  {
    code: "registry:pay",
    title: "Pagar registro por PIX",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Iniciar ou consultar o PIX de uma cotação registral aprovada; o pagador é opcional e pode ser reutilizado",
    sensitive: true,
    source: "app/integrations/scopes.py:97",
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
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Receber no endpoint da aplicação os eventos das análises que ela iniciou, sem consultar resultado ou documento",
    sensitive: false,
    source: "app/integrations/scopes.py:41",
  },
  {
    code: "events:registry",
    title: "Receber eventos registrais",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Receber eventos de pedidos, prévias e cotações registrais originados pela aplicação",
    sensitive: false,
    source: "app/integrations/scopes.py:48",
  },
  {
    code: "events:payment",
    title: "Receber eventos de pagamento",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Receber eventos de criação, confirmação, falha e estorno de pagamentos ligados à aplicação",
    sensitive: false,
    source: "app/integrations/scopes.py:54",
  },
  {
    code: "events:acquisition",
    title: "Receber eventos de aquisição",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Receber eventos do andamento da aquisição externa originada pela aplicação",
    sensitive: false,
    source: "app/integrations/scopes.py:60",
  },
  {
    code: "events:certificate",
    title: "Receber eventos de certidão",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Receber eventos de certidões opcionais vinculadas à aplicação",
    sensitive: false,
    source: "app/integrations/scopes.py:66",
  },
  {
    code: "events:connection",
    title: "Receber eventos de conexão",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Receber eventos de autorização e revogação da conexão do titular",
    sensitive: false,
    source: "app/integrations/scopes.py:72",
  },
  {
    code: "events:credential",
    title: "Receber eventos de credencial",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Receber eventos de emissão e revogação de credenciais da aplicação",
    sensitive: false,
    source: "app/integrations/scopes.py:78",
  },
  {
    code: "events:commission",
    title: "Receber eventos de comissão",
    status: "implemented",
    grantedByDefault: false,
    unlocks:
      "Receber eventos de comissão devida ou revertida após os gates financeiros",
    sensitive: true,
    source: "app/integrations/scopes.py:84",
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
