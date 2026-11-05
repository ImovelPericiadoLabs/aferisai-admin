import { endpointRows, endpointSection } from "./api-reference";
import type { DocPage } from "./docs-model";
import {
  ANALYSIS_ENDPOINTS,
  PAYMENT_SUPPORT_ENDPOINTS,
  REGISTRY_ENDPOINTS,
} from "./partner-endpoints";

const isPayment = (path: string) => /\/(pix|credits)$/.test(path);
const paymentEndpoints = [...ANALYSIS_ENDPOINTS, ...REGISTRY_ENDPOINTS].filter(
  (endpoint) => isPayment(endpoint.path),
);
const analysisFlow = ANALYSIS_ENDPOINTS.filter((e) => !isPayment(e.path));
const registryFlow = REGISTRY_ENDPOINTS.filter((e) => !isPayment(e.path));

/** Event, the scope a token needs to receive it, and what triggers it. */
export const EVENT_ROWS: string[][] = [
  [
    "`analysis.created`",
    "`events:analysis`",
    "A solicitação do arquivo foi criada.",
  ],
  [
    "`analysis.completed`",
    "`events:analysis`",
    "A análise terminou e o resultado está disponível.",
  ],
  ["`analysis.failed`", "`events:analysis`", "A análise falhou."],
  [
    "`analysis.review_required`",
    "`events:analysis`",
    "A análise precisa de revisão da equipe.",
  ],
  [
    "`registry.created`",
    "`events:registry`",
    "O pedido de registro foi criado.",
  ],
  [
    "`registry.preview.completed`",
    "`events:registry`",
    "A prévia de custo terminou.",
  ],
  ["`registry.quote.created`", "`events:registry`", "A cotação foi aprovada."],
  [
    "`registry.quote.expired`",
    "`events:registry`",
    "A cotação venceu sem pagamento.",
  ],
  ["`payment.created`", "`events:payment`", "O PIX foi gerado."],
  [
    "`payment.confirmed`",
    "`events:payment`",
    "O pagamento foi confirmado (PIX ou créditos).",
  ],
  ["`payment.failed`", "`events:payment`", "O pagamento falhou."],
  ["`payment.refunded`", "`events:payment`", "O pagamento foi estornado."],
  [
    "`acquisition.submitted`",
    "`events:acquisition`",
    "O pedido foi enviado ao fornecedor.",
  ],
  [
    "`acquisition.completed`",
    "`events:acquisition`",
    "O documento foi obtido.",
  ],
  [
    "`acquisition.failed`",
    "`events:acquisition`",
    "A obtenção do documento falhou.",
  ],
  [
    "`certificate.available`",
    "`events:certificate`",
    "Uma certidão comprada ficou disponível.",
  ],
  [
    "`connection.created`",
    "`events:connection`",
    "O titular autorizou a aplicação.",
  ],
  [
    "`connection.revoked`",
    "`events:connection`",
    "O titular revogou a conexão.",
  ],
  [
    "`credential.created`",
    "`events:credential`",
    "Uma credencial foi emitida.",
  ],
  [
    "`credential.revoked`",
    "`events:credential`",
    "Uma credencial foi revogada.",
  ],
  ["`commission.owed`", "`events:commission`", "Uma comissão ficou devida."],
  [
    "`commission.reverted`",
    "`events:commission`",
    "Uma comissão foi revertida.",
  ],
];

const MAP = `① CONECTAR
   GET  /oauth/authorize        (PKCE S256)  → titular aprova → 303 com code
   POST /oauth/token                          → Bearer de 15 min, sem refresh

② SOLICITAR
   arquivo   POST /v1/partner/analyses                    [analysis:submit:upload]
   matrícula POST /v1/partner/registry-requests/number     [registry:submit]
   endereço  POST /v1/partner/registry-requests/address    [registry:submit]
   cartório  GET  /v1/registry-offices                     (público)

③ COTAR
   análise   GET  …/analyses/{id}/certificate-options      [analysis:quote]
             POST …/analyses/{id}/quotes                   [analysis:quote]
   registro  POST …/registry-requests/{id}/preview         [registry:preview]
             GET  …/registry-requests/{id}/certificate-options [certificate:read]
             POST …/registry-requests/{id}/quote           [registry:quote]

④ PAGAR
   opções    GET  /v1/partner/payment-options              [payment:read]
   aceite    GET  /v1/legal/catalog                        (público)
   PIX       POST …/{id}/pix                               [analysis:pay | registry:pay]
   créditos  POST …/{id}/credits                           [payment:credits]
   consultar GET  …/{id}/pix                               [payment:read]

⑤ ACOMPANHAR E BAIXAR
   análise   GET  …/analyses/{id}  /result  /report.pdf  /complete.pdf  /original
             GET  …/analyses/{id}/certificates  e  /{task}/document   [analysis:read]
   registro  GET  …/registry-requests  e  /{id}                      [registry:read]`;

const DECISION = `GET /v1/partner/payment-options
        │
        ├─ methods vazio ───────────► não ofereça pagamento por aqui
        │
        ├─ "credits" em methods ────► mostre "Pagar com créditos (R$ available_cents)"
        │                                  └► POST …/{id}/credits
        │
        └─ "pix" em methods ────────► mostre "Pagar com PIX"
                 │                         └► POST …/{id}/pix
                 ├─ payer.registered = true ► "Usar pagador salvo (final document_last4)"
                 │                            envie o POST sem payer
                 └─ payer.registered = false ► peça nome e CPF/CNPJ e envie em payer`;

export const apiPages: DocPage[] = [
  {
    id: "mapa",
    group: "integracao",
    title: "Mapa da integração",
    summary: "O caminho inteiro, do consentimento ao download, com os escopos.",
    sections: [
      {
        id: "caminho",
        title: "Do consentimento ao download",
        blocks: [
          {
            type: "p",
            text: "Cada passo é uma chamada com um escopo próprio. O parceiro só enxerga o que a própria aplicação iniciou para o titular conectado; o resto responde `404`.",
          },
          { type: "code", language: "text", label: "Mapa", code: MAP },
          {
            type: "callout",
            tone: "note",
            text: "Cartão, débito e desafios 3DS ficam só no checkout da plataforma AferisAI. O parceiro paga por PIX ou créditos.",
          },
        ],
      },
      {
        id: "eventos-por-escopo",
        title: "Eventos que o parceiro recebe",
        blocks: [
          {
            type: "p",
            text: "Cada evento exige o escopo `events:*` correspondente na credencial e na aprovação do titular. Veja a entrega e a assinatura em [Webhooks](webhooks).",
          },
          {
            type: "table",
            caption: "Eventos, escopos e gatilhos",
            columns: ["Evento", "Escopo", "Quando acontece"],
            rows: EVENT_ROWS,
          },
        ],
      },
    ],
  },
  {
    id: "referencia-api",
    group: "integracao",
    title: "Referência de endpoints",
    summary: "Todas as rotas, com método, escopo e o que fazem.",
    sections: [
      {
        id: "como-ler",
        title: "Como ler",
        blocks: [
          {
            type: "p",
            text: "Todas as rotas `/v1/partner` exigem `Authorization: Bearer` com o token delegado de [OAuth e PKCE](oauth). Cada página de uso (Análise, Registro, Pagamento) detalha corpo, resposta, erros e exemplos de cada rota.",
          },
        ],
      },
      {
        id: "tabela-analises",
        title: "Análise de matrícula",
        blocks: [
          {
            type: "table",
            caption: "Rotas de análise",
            columns: ["Rota", "Escopo", "Para quê"],
            rows: endpointRows(ANALYSIS_ENDPOINTS),
          },
        ],
      },
      {
        id: "tabela-registro",
        title: "Pedido de registro",
        blocks: [
          {
            type: "table",
            caption: "Rotas de registro",
            columns: ["Rota", "Escopo", "Para quê"],
            rows: endpointRows(REGISTRY_ENDPOINTS),
          },
        ],
      },
      {
        id: "tabela-apoio",
        title: "Apoio ao pagamento e ao pedido",
        blocks: [
          {
            type: "table",
            caption: "Rotas de apoio",
            columns: ["Rota", "Escopo", "Para quê"],
            rows: endpointRows(PAYMENT_SUPPORT_ENDPOINTS),
          },
        ],
      },
    ],
  },
  {
    id: "analises-api",
    group: "integracao",
    title: "Análise de matrícula",
    summary: "Envie o arquivo, cote e leia o resultado e os documentos.",
    scopes: ["analysis:submit:upload", "analysis:quote", "analysis:read"],
    sections: [
      {
        id: "fluxo",
        title: "O fluxo",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Enviar",
                text: "`POST /v1/partner/analyses` cria a solicitação (`awaiting_quote`).",
              },
              {
                title: "Cotar",
                text: "`POST …/quotes` aprova o preço, com certidões opcionais.",
              },
              {
                title: "Pagar",
                text: "PIX ou créditos, em [Pagamento](pagamento).",
              },
              {
                title: "Acompanhar",
                text: "`GET …/{id}` até `ready`, ou o evento `analysis.completed`.",
              },
              {
                title: "Baixar",
                text: "`result`, `report.pdf`, `complete.pdf`, `original` e as certidões.",
              },
            ],
          },
        ],
      },
      ...analysisFlow.map(endpointSection),
    ],
  },
  {
    id: "registro-api",
    group: "integracao",
    title: "Pedido de registro",
    summary: "Peça por matrícula, CNM ou endereço, consulte o custo e cote.",
    scopes: [
      "registry:submit",
      "registry:preview",
      "certificate:read",
      "registry:quote",
      "registry:read",
    ],
    sections: [
      {
        id: "fluxo",
        title: "O fluxo",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Achar o cartório",
                text: "`GET /v1/registry-offices` devolve o `office_id`.",
              },
              { title: "Pedir", text: "`POST …/number` ou `POST …/address`." },
              {
                title: "Prévia",
                text: "`POST …/{id}/preview`, uma única vez.",
              },
              {
                title: "Cotar",
                text: "`POST …/{id}/quote`, com certidões opcionais.",
              },
              {
                title: "Pagar",
                text: "PIX ou créditos, em [Pagamento](pagamento).",
              },
              {
                title: "Acompanhar",
                text: "`GET …/{id}` ou os eventos `acquisition.*`.",
              },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            text: "Não há rota para baixar o documento do registro. Hoje o parceiro acompanha o pedido e recebe os eventos.",
          },
        ],
      },
      ...registryFlow.map(endpointSection),
    ],
  },
  {
    id: "pagamento",
    group: "integracao",
    title: "Pagamento: PIX e créditos",
    summary: "Descubra como o titular pode pagar e gere o PIX ou use créditos.",
    scopes: ["payment:read", "analysis:pay", "registry:pay", "payment:credits"],
    sections: [
      {
        id: "regras",
        title: "Regras do pagamento delegado",
        blocks: [
          {
            type: "list",
            items: [
              "Valor e vencimento vêm sempre da cotação aprovada; o parceiro não escolhe nenhum dos dois.",
              "PIX e créditos são pagos em nome do titular conectado.",
              "`payment:credits` debita uma única vez o saldo confirmado e não autoriza PIX, recarga, cartão ou 3DS.",
              "Cartão, débito e desafios 3DS ficam só no checkout da plataforma AferisAI.",
              "Resultado externo incerto não gera novo POST: consulte pelo GET.",
            ],
          },
        ],
      },
      {
        id: "decidir-opcoes",
        title: "Decidir o que mostrar ao cliente",
        blocks: [
          {
            type: "p",
            text: "Antes de pagar, consulte `GET /v1/partner/payment-options`. Ele diz o saldo, se há pagador salvo e quais meios este token pode usar.",
          },
          { type: "code", language: "text", label: "Decisão", code: DECISION },
        ],
      },
      {
        id: "aceite-juridico",
        title: "Aceite jurídico",
        blocks: [
          {
            type: "p",
            text: "Todo POST de pagamento leva `legal_policy_version` e, em `documents`, a `version` e o `sha256` de cada documento. Pegue tudo pronto em `GET /v1/legal/catalog`: não renderize nem calcule hashes, e mostre os documentos ao titular antes de enviar.",
          },
          {
            type: "code",
            language: "json",
            label: "Corpo de pagamento",
            code: '{\n  "legal_policy_version": "2.0",\n  "documents": {\n    "termos-de-servico": { "version": "2.1", "sha256": "<64 hex minúsculos>" }\n  },\n  "payer": { "name": "Maria Souza", "document": "12345678901" }\n}',
          },
        ],
      },
      ...[...PAYMENT_SUPPORT_ENDPOINTS.slice(0, 2), ...paymentEndpoints].map(
        endpointSection,
      ),
    ],
  },
  {
    id: "rotas-de-apoio",
    group: "integracao",
    title: "Rotas de apoio",
    summary: "Cartórios, manutenção e a própria aplicação.",
    sections: PAYMENT_SUPPORT_ENDPOINTS.slice(2).map(endpointSection),
  },
];
