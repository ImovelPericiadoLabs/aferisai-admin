/** User-facing labels for API values; permissions continue to use the original values. */
const roleLabels: Record<string, string> = {
  administrator: "Administrador",
  manager: "Gestor",
  financial: "Financeiro",
  viewer: "Consulta",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  expired: "Expirado",
  revoked: "Revogado",
  draft: "Rascunho",
  published: "Publicado",
  pending: "Pendente",
  awaiting_input: "Aguardando informações",
  dispatched: "Enviado ao fornecedor",
  confirmed: "Confirmado",
  unavailable: "Indisponível",
  failed: "Falha",
  unknown: "Em conferência",
  blocked: "Bloqueado",
  running: "Em processamento",
  completed: "Concluído",
  prepared: "Preparado",
  received: "Pagamento confirmado",
  review: "Em conferência",
  provisional: "Provisório",
  owed: "A pagar",
  settled: "Pago",
  reversed: "Estornado",
  done: "Concluída",
  attempted: "Tentativa registrada",
  not_sent: "Ainda não enviado",
  available: "Disponível",
  purged: "Eliminado",
  eligible: "Elegível",
  unsupported: "Fora do limite técnico",
  non_registry: "Fora da oferta",
};

const sourceLabels: Record<string, string> = {
  number: "Número da matrícula",
  cnm: "Código Nacional de Matrícula",
  address: "Endereço",
  upload: "Arquivo enviado",
  site: "Site direto",
  integration: "Integração",
  promotion: "Promoção",
};

const itemLabels: Record<string, string> = {
  "*": "Todos os itens",
  matricula: "Matrícula",
  inteiro_teor_simples: "Inteiro teor simples",
  inteiro_teor: "Inteiro teor",
  visualizacao: "Visualização",
  analysis: "Análise da matrícula",
  analysis_completed: "Análise concluída",
  registry_completed: "Matrícula entregue",
  registry_record: "Matrícula original",
  third_party_report: "Relatório de terceiros",
  unverified: "Documento não verificado",
};

const promotionLabels: Record<string, string> = {
  coupon: "Cupom",
  link: "Link promocional",
};

const decisionLabels: Record<string, string> = {
  draft_absent: "Rascunho não localizado",
  draft_present: "Rascunho localizado",
  purchase_suspected: "Compra sob suspeita",
  inconclusive: "Inconclusivo",
  draft_found: "Rascunho localizado",
  approve: "Aprovado",
  reject: "Rejeitado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  correct: "Correção",
  refund: "Reembolso",
  no_purchase: "Compra não realizada",
  protocol: "Protocolo localizado",
};

const scopeLabels: Record<string, string> = {
  "analysis:read": "Consultar análises",
  "analysis:submit:upload": "Enviar matrícula para análise",
  "analysis:create": "Solicitar análises",
  "analysis:write": "Gerenciar análises",
  "registry:read": "Consultar pedidos de matrícula",
  "registry:create": "Solicitar matrícula",
  "registry:write": "Gerenciar pedidos de matrícula",
};

function label(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  return map[value] ?? fallback;
}

export const teamRoleLabel = (value: string | null | undefined) =>
  label(roleLabels, value, "Cargo não identificado");
export const statusLabel = (value: string | null | undefined) =>
  label(statusLabels, value, "Estado não identificado");
export const analysisWorkStatusLabel = (value: string | null | undefined) =>
  label(
    {
      pending: "Na fila",
      blocked: "Aguardando liberação",
      running: "Em processamento",
      suspended: "Processamento suspenso",
      unknown: "Resultado externo em conferência",
      failed: "Falha no processamento",
      completed: "Análise concluída",
    },
    value,
    "Estado do trabalho não identificado",
  );
export const registryStatusLabel = (value: string | null | undefined) =>
  label(
    {
      pending: "Aguardando cotação ou envio",
      awaiting_input: "Aguardando informações",
      dispatched: "Pedido enviado ao cartório",
      confirmed: "Documento confirmado",
      unavailable: "Documento indisponível",
      failed: "Falha no pedido",
      unknown: "Pedido em conciliação",
    },
    value,
    "Estado do pedido não identificado",
  );
export const sourceLabel = (value: string | null | undefined) =>
  label(sourceLabels, value, "Origem não identificada");
export const itemLabel = (value: string | null | undefined) =>
  label(itemLabels, value, "Item não identificado");
export const promotionKindLabel = (value: string | null | undefined) =>
  label(promotionLabels, value, "Promoção não identificada");
export const decisionLabel = (value: string | null | undefined) =>
  label(decisionLabels, value, "Decisão não identificada");
export const scopeLabel = (value: string | null | undefined) =>
  label(scopeLabels, value, "Permissão não identificada");
