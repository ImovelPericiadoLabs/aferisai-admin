/**
 * Plain-language names for the technical codes that open a paid exception. The codes come from the
 * backend's error catalogue (acquisition.*); anything not listed keeps its code on screen, so a new
 * backend code never shows a wrong explanation.
 */
export type Supplier = "InfoSimples" | "ONR (RI Digital)";

export type Cause = {
  /** What happened, in words. */
  title: string;
  /** The supplier involved, when the code names one. */
  supplier: Supplier | null;
  /** The outcome at the supplier is not known: it has to be checked in Conciliação before acting again. */
  uncertain: boolean;
  /** The technical code, kept for support. */
  code: string;
};

type Entry = [title: string, supplier: Supplier, uncertain: boolean];

const KNOWN: Record<string, Entry> = {
  "acquisition.infosimples_configuration_invalid": [
    "Configuração da InfoSimples inválida",
    "InfoSimples",
    false,
  ],
  "acquisition.infosimples_request_invalid": [
    "Pedido recusado pela InfoSimples por dados inválidos",
    "InfoSimples",
    false,
  ],
  "acquisition.infosimples_submission_unknown": [
    "Envio à InfoSimples sem resposta confirmada",
    "InfoSimples",
    true,
  ],
  "acquisition.infosimples_submission_retry_exhausted": [
    "Tentativas de envio à InfoSimples esgotadas",
    "InfoSimples",
    false,
  ],
  "acquisition.infosimples_submission_price_expired": [
    "Preço do fornecedor expirou antes do envio",
    "InfoSimples",
    false,
  ],
  "acquisition.infosimples_registration_not_found": [
    "Matrícula não encontrada no fornecedor",
    "InfoSimples",
    false,
  ],
  "acquisition.infosimples_order_list_invalid": [
    "Lista de pedidos da InfoSimples inválida",
    "InfoSimples",
    false,
  ],
  "acquisition.infosimples_download_unknown": [
    "Download do documento sem confirmação",
    "InfoSimples",
    true,
  ],
  "acquisition.infosimples_download_exhausted": [
    "Tentativas de baixar o documento esgotadas",
    "InfoSimples",
    false,
  ],
  "acquisition.infosimples_pdf_host_invalid": [
    "Endereço do PDF inválido",
    "InfoSimples",
    false,
  ],
  "acquisition.infosimples_pdf_fetch_unknown": [
    "Busca do PDF sem confirmação",
    "InfoSimples",
    true,
  ],
  "acquisition.infosimples_document_invalid": [
    "Documento recebido inválido",
    "InfoSimples",
    false,
  ],
  "acquisition.onr_portal_configuration_invalid": [
    "Configuração do portal ONR inválida",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_session_unavailable": [
    "Sessão no portal ONR indisponível",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_auth_rejected": [
    "Portal ONR recusou o login",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_maintenance": [
    "Portal ONR em manutenção",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_preview_invalid": [
    "Prévia do portal ONR inválida",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_office_unavailable": [
    "Cartório indisponível no portal ONR",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_certificate_unavailable": [
    "Certidão indisponível no portal ONR",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_origin_unavailable": [
    "Origem indisponível no portal ONR",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_balance_unknown": [
    "Saldo no portal ONR desconhecido",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_orders_unavailable": [
    "Lista de pedidos do portal ONR indisponível",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_order_detail_unavailable": [
    "Detalhe do pedido no portal ONR indisponível",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_document_unavailable": [
    "Documento indisponível no portal ONR",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_document_invalid": [
    "Documento do portal ONR inválido",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_order_returned": [
    "Pedido devolvido pelo portal ONR",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_order_cancelled": [
    "Pedido cancelado no portal ONR",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_submission_cost_changed": [
    "Custo do pedido mudou no portal ONR",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_submission_account_changed": [
    "Conta do portal ONR mudou durante o envio",
    "ONR (RI Digital)",
    false,
  ],
  "acquisition.onr_portal_submission_unknown": [
    "Envio ao portal ONR sem resposta confirmada",
    "ONR (RI Digital)",
    true,
  ],
  "acquisition.onr_portal_submission_prepurchase_failed": [
    "Falha antes da compra no portal ONR",
    "ONR (RI Digital)",
    false,
  ],
};

export function causeOf(code: string): Cause {
  const known = KNOWN[code];
  if (!known)
    return {
      title: "Causa ainda sem descrição",
      supplier: null,
      uncertain: false,
      code,
    };
  return { title: known[0], supplier: known[1], uncertain: known[2], code };
}
