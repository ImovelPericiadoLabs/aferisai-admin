import type { Endpoint } from "./api-reference";

const AUTH: [string, string] = [
  "Authorization",
  "`Bearer <token>` obtido em [OAuth e PKCE](oauth). Dura 15 minutos e não há refresh.",
];
const KEY: [string, string] = [
  "Idempotency-Key",
  "UUIDv7 canônico, novo para cada operação nova. Reenvie a mesma chave para repetir a mesma operação.",
];
const JSON_TYPE: [string, string] = ["Content-Type", "`application/json`"];

const E401: [string, string] = [
  "401",
  "Token ausente, expirado, revogado, sem o escopo, de `client_credentials` ou conexão revogada.",
];
const E404: [string, string] = [
  "404",
  "O recurso não existe, ou não pertence a esta aplicação e a este titular.",
];
const E409 = (text: string): [string, string] => ["409", text];
const E422: [string, string] = ["422", "Identificador ou corpo inválido."];
const E503: [string, string] = [
  "503",
  "Serviço temporariamente indisponível: tente de novo.",
];

/** Corpo comum dos pagamentos: o aceite jurídico que o titular leu. */
const LEGAL_FIELDS: [string, string, string, string][] = [
  [
    "legal_policy_version",
    "texto",
    "sim",
    "Versão do pacote jurídico vigente, copiada de `GET /v1/legal/catalog`.",
  ],
  [
    "documents",
    "objeto",
    "sim",
    "Um item por documento (`politica-de-privacidade`, `termos-de-servico`, `politica-de-cancelamento-e-reembolso`, `exclusao-de-dados`, `aviso-de-cookies`) com `version` e `sha256`, copiados do catálogo.",
  ],
];

const PIX_RESPONSE: [string, string][] = [
  ["intent_id", "UUIDv7 da cobrança."],
  ["amount_cents", "Valor em centavos de real, definido pela cotação."],
  ["currency", "`BRL`."],
  ["due_date", "Vencimento (fuso America/Sao_Paulo)."],
  ["pix_payload", "Código PIX copia e cola."],
  ["qr_image_base64", "Imagem do QR em base64."],
  ["qr_expires_at", "Até quando o QR vale."],
];

const CREDITS_RESPONSE: [string, string][] = [
  ["intent_id", "UUIDv7 da compra."],
  ["amount_cents", "Valor debitado em centavos."],
  ["currency", "`BRL`."],
  ["payment_method", "`credits`."],
  ["balance_cents", "Saldo do titular depois do débito, em centavos."],
];

const PAGINATION: [string, string, string, string][] = [
  ["limit", "inteiro", "não", "Itens por página."],
  ["cursor", "UUIDv7", "não", "Valor de `next_cursor` da página anterior."],
];

export const ANALYSIS_ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/v1/partner/analyses",
    title: "Enviar o arquivo da matrícula",
    scope: "analysis:submit:upload",
    purpose:
      "Recebe o PDF, PNG ou JPEG como corpo binário único, até 200 MB, em nome do titular conectado. Cria uma solicitação aguardando cotação; não cobra nem inicia a análise.",
    headers: [
      AUTH,
      KEY,
      [
        "Content-Type",
        "Exatamente um de `application/pdf`, `image/png` ou `image/jpeg`.",
      ],
    ],
    response: {
      status: "201",
      text: "Solicitação criada. O cabeçalho `Location` aponta para o estado.",
      fields: [
        ["id", "UUIDv7 da solicitação."],
        [
          "state",
          "`awaiting_quote` (pode cotar) ou `source_not_eligible` (tipo fora da oferta, não pode ser cobrado).",
        ],
      ],
    },
    errors: [
      [
        "303",
        "Mesmo envio já recebido com esta chave: redireciona para o estado atual.",
      ],
      ["400", "Cabeçalho repetido ou corpo ilegível."],
      E401,
      ["408", "O corpo demorou demais para chegar."],
      E409("A mesma chave foi usada por outra origem."),
      ["413", "Arquivo maior que 200 MB."],
      ["415", "Tipo de arquivo não aceito."],
      ["422", "Arquivo vazio ou `Idempotency-Key` que não é UUIDv7 canônico."],
      E503,
    ],
    notes: [
      "Revogação ou expiração do token durante o envio responde `401` sem criar nada.",
      "Envie o arquivo cru (`--data-binary`), não multipart.",
    ],
    events: ["analysis.created"],
    example: {
      label: "cURL",
      language: "shell",
      code: 'curl --request POST "$API_URL/v1/partner/analyses" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Idempotency-Key: $(uuidgen)" \\\n  --header "Content-Type: application/pdf" \\\n  --data-binary @matricula.pdf',
    },
  },
  {
    method: "GET",
    path: "/v1/partner/analyses",
    title: "Listar as análises da aplicação",
    scope: "analysis:read",
    purpose:
      "Lista, da mais nova para a mais antiga, só as solicitações que esta aplicação criou para o titular conectado. Cada item traz `id` e `created_at`; consulte o estado por id.",
    headers: [AUTH],
    query: PAGINATION,
    response: {
      status: "200",
      text: "Página de itens.",
      fields: [
        ["items", "Lista de `{ id, created_at }`."],
        ["next_cursor", "Cursor da próxima página; nulo encerra."],
      ],
    },
    errors: [E401, E422, E503],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}",
    title: "Consultar o estado da análise",
    scope: "analysis:read",
    purpose:
      "Mostra só o estado e se o resultado está disponível. Não traz documento, relatório, pagador nem dados financeiros.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "Estado atual.",
      fields: [
        [
          "state",
          "`awaiting_quote`, `source_not_eligible`, `source_unverified`, `awaiting_payment`, `payment_verification`, `payment_review`, `queued`, `running`, `needs_attention`, `processing_review`, `awaiting_review`, `inconclusive`, `ready` ou `expired`.",
        ],
        ["result_available", "`true` quando `…/result` já pode ser lido."],
      ],
    },
    errors: [E401, E404, E422, E503],
    notes: [
      "Depois de um erro de rede ou resposta incerta, reconcilie sempre por este GET.",
    ],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/certificate-options",
    title: "Ver as certidões opcionais",
    scope: "analysis:quote",
    purpose:
      "Lista só os tipos de certidão com custo, PDF e débito comprovados para este arquivo. Não cria PIX nem consulta o fornecedor.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "Opções e quando foram conferidas.",
      fields: [
        [
          "items",
          "Tipos disponíveis, para escolher em `certificate_selections` da cotação.",
        ],
        ["checked_at", "Momento da conferência."],
      ],
    },
    errors: [E401, E404, E422, E503],
  },
  {
    method: "POST",
    path: "/v1/partner/analyses/{analysis_id}/quotes",
    title: "Cotar o arquivo",
    scope: "analysis:quote",
    purpose:
      "Aprova o preço de um arquivo de até três páginas, com certidões opcionais se pedidas. Não cria PIX, não debita créditos e não compra nada.",
    headers: [AUTH, JSON_TYPE],
    body: {
      caption: "Corpo (opcional)",
      fields: [
        [
          "promotion_code",
          "texto",
          "não",
          "Código de promoção; prevalece sobre o link capturado.",
        ],
        [
          "certificate_selections",
          "lista",
          "não",
          "Certidões incluídas no mesmo preço, no máximo 9 e uma por tipo.",
        ],
      ],
    },
    response: {
      status: "201",
      text: "Cotação aprovada.",
      fields: [
        ["id", "UUIDv7 da cotação."],
        ["list_price_cents", "Preço público antes do desconto."],
        ["discount_cents", "Desconto aplicado; zero sem promoção."],
        ["amount_cents", "Preço final que será cobrado."],
        ["currency", "`BRL`."],
        ["expires_at", "Fim da validade: pague antes disso."],
        ["certificate_selections", "Certidões incluídas."],
        ["certificate_cost_cents", "Custo reservado das certidões."],
        ["certificate_sale_cents", "Adicional comercial das certidões."],
      ],
    },
    errors: [
      E401,
      E404,
      E409(
        "Oferta, origem ou vínculo mudaram, ou a cotação não pode ser refeita.",
      ),
      E422,
      E503,
    ],
    example: {
      label: "cURL",
      language: "shell",
      code: 'curl --request POST "$API_URL/v1/partner/analyses/$ANALYSIS_ID/quotes" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Content-Type: application/json" \\\n  --data \'{"certificate_selections": []}\'',
    },
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/quotes",
    title: "Reler a cotação",
    scope: "analysis:quote",
    purpose:
      "Recupera o preço e as certidões congelados na cotação. Não cria cobrança.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "`{ quote }` com os mesmos campos da cotação, ou `quote` nulo se ainda não há.",
    },
    errors: [E401, E404, E422, E503],
  },
  {
    method: "POST",
    path: "/v1/partner/analyses/{analysis_id}/pix",
    title: "Gerar o PIX da análise",
    scope: "analysis:pay",
    purpose:
      "Cria ou recupera o PIX da cotação aprovada. O parceiro não escolhe valor nem vencimento. Veja [Pagamento](pagamento).",
    headers: [AUTH, JSON_TYPE],
    body: {
      caption: "Corpo",
      fields: [
        ...LEGAL_FIELDS,
        [
          "payer",
          "objeto",
          "não",
          "`{ name, document }` (nome civil e CPF/CNPJ). Se já existir o mesmo pagador, é reutilizado.",
        ],
      ],
    },
    response: { status: "200", text: "A cobrança PIX.", fields: PIX_RESPONSE },
    errors: [
      E401,
      E404,
      E409(
        "Cotação ausente ou expirada, pagador diferente do já cadastrado, QR indisponível ou aceite jurídico desatualizado.",
      ),
      E422,
      E503,
    ],
    events: ["payment.created", "payment.confirmed", "payment.failed"],
    notes: ["Resultado externo incerto não gera novo POST: consulte pelo GET."],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/pix",
    title: "Consultar o PIX da análise",
    scope: "payment:read",
    purpose: "Mostra a cobrança PIX já criada pela aplicação, sem criar outra.",
    headers: [AUTH],
    response: { status: "200", text: "A cobrança PIX.", fields: PIX_RESPONSE },
    errors: [
      E401,
      E404,
      E409("Ainda não há PIX para esta cotação."),
      E422,
      E503,
    ],
  },
  {
    method: "POST",
    path: "/v1/partner/analyses/{analysis_id}/credits",
    title: "Pagar a análise com créditos",
    scope: "payment:credits",
    purpose:
      "Debita uma única vez o saldo confirmado do titular para a cotação aprovada. Não cria PIX, não aceita valor e não libera cartão.",
    headers: [AUTH, JSON_TYPE],
    body: { caption: "Corpo", fields: LEGAL_FIELDS },
    response: {
      status: "200",
      text: "O débito feito.",
      fields: CREDITS_RESPONSE,
    },
    errors: [
      E401,
      E404,
      E409(
        "Saldo insuficiente, cotação expirada ou aceite jurídico desatualizado.",
      ),
      E422,
      E503,
    ],
    events: ["payment.confirmed"],
    notes: ["A repetição idêntica devolve o mesmo débito."],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/result",
    title: "Ler o resultado",
    scope: "analysis:read",
    purpose:
      "Lê as menções factuais preliminares. Exige pagamento recebido, conclusão técnica e decisão elegível. Não traz o original, o pagador nem dados financeiros.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "Resultado preliminar.",
      fields: [
        ["id, kind, revision", "Identificação do resultado e da revisão."],
        [
          "formatted_address, route, city, state, postal_code …",
          "Endereço e localização citados no original; nulos quando não constam.",
        ],
        ["registration_number, notary", "Matrícula e cartório."],
        [
          "persons_mentioned, reported_current_owners",
          "Pessoas citadas e proprietários indicados no original.",
        ],
        ["burdens_mentioned, acts_cited", "Ônus e atos citados."],
        [
          "criteria_assessments, provisional_signal, overall_signal",
          "Critérios e sinal geral.",
        ],
        [
          "citations_text_confirmed",
          "Se as citações foram conferidas no texto.",
        ],
        ["notice", "Aviso de que não é laudo jurídico."],
      ],
    },
    errors: [
      E401,
      E404,
      E409("O resultado ainda não está disponível."),
      E422,
      E503,
    ],
    notes: ["Não constitui laudo jurídico nem prova de regularidade."],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/report.pdf",
    title: "Baixar o relatório",
    scope: "analysis:read",
    purpose: "Entrega o relatório analítico preliminar em PDF.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "`application/pdf` com `Content-Disposition: attachment` e `Cache-Control: private, no-store`.",
    },
    errors: [
      E401,
      E404,
      E409("O relatório ainda não está disponível."),
      E422,
      E503,
    ],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/complete.pdf",
    title: "Baixar o dossiê completo",
    scope: "analysis:read",
    purpose:
      "Entrega um PDF único com o relatório, o original e as certidões concluídas, nessa ordem.",
    headers: [AUTH],
    response: { status: "200", text: "`application/pdf` para download." },
    errors: [
      E401,
      E404,
      E409("Decisão, origem ou arquivos mudaram ou ainda não estão prontos."),
      E422,
      E503,
    ],
    notes: [
      "Acima de 90 MB de anexo, o PDF é montado em diretório privado, com até 512 MB de entrada.",
      "Não inicia compra.",
    ],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/original",
    title: "Baixar o arquivo original",
    scope: "analysis:read",
    purpose:
      "Entrega o original ao titular, só se esta aplicação iniciou a análise. Revalida conexão, origem, retenção e integridade.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "O arquivo original, com o tipo em que foi enviado.",
    },
    errors: [
      E401,
      E404,
      E409(
        "Original adquirido exige PIX recebido e sem reversão, ou o arquivo já não está retido.",
      ),
      E422,
      ["500", "A integridade dos bytes não foi confirmada."],
      E503,
    ],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/certificates",
    title: "Listar as certidões compradas",
    scope: "analysis:read",
    purpose:
      "Lista os tipos comprados e os resultados por titular ou imóvel desta análise.",
    headers: [AUTH],
    query: PAGINATION,
    response: {
      status: "200",
      text: "Certidões da análise.",
      fields: [
        [
          "selected_kinds, planning_kinds",
          "Tipos escolhidos e em planejamento.",
        ],
        [
          "unavailable_kinds",
          "Tipos sem titular identificado; nenhuma consulta foi feita ao fornecedor.",
        ],
        ["items", "Resultados, com `task_id` para baixar o PDF."],
        ["next_cursor", "Próxima página; nulo encerra."],
      ],
    },
    errors: [
      E401,
      E404,
      E409("Análise ainda sem certidões liberadas."),
      E422,
      E503,
    ],
    events: ["certificate.available"],
  },
  {
    method: "GET",
    path: "/v1/partner/analyses/{analysis_id}/certificates/{task_id}/document",
    title: "Baixar o PDF de uma certidão",
    scope: "analysis:read",
    purpose:
      "Entrega o PDF da certidão comprada. Revalida conexão, origem, pagamento, decisão, vínculo da tarefa e hash dos bytes.",
    headers: [AUTH],
    response: { status: "200", text: "`application/pdf` para download." },
    errors: [
      E401,
      E404,
      E409("O PDF ainda não foi validado."),
      E422,
      ["500", "Falha de integridade."],
      E503,
    ],
  },
];

const ADDRESS_FIELDS: [string, string, string, string][] = [
  [
    "line",
    "texto",
    "sim",
    "Endereço confirmado pelo titular (3 a 500 caracteres).",
  ],
  [
    "postal_code",
    "texto",
    "não",
    "CEP `00000-000`; obrigatório na prévia e cotação por endereço no RI Digital.",
  ],
  [
    "number / without_number",
    "texto / booleano",
    "não",
    "Número predial, ou a confirmação de que não há.",
  ],
  [
    "registration_number / registration_unknown",
    "texto / booleano",
    "não",
    "Matrícula conhecida, ou a confirmação de que o titular não sabe.",
  ],
  [
    "allotment / without_allotment",
    "texto / booleano",
    "não",
    "Loteamento, ou a confirmação de que não há.",
  ],
  [
    "block / without_block",
    "texto / booleano",
    "não",
    "Quadra, ou a confirmação de que não há.",
  ],
  [
    "lot / without_lot",
    "texto / booleano",
    "não",
    "Lote, ou a confirmação de que não há.",
  ],
  ["complement", "texto", "não", "Complemento livre (até 120 caracteres)."],
  [
    "place_id / location_hint",
    "texto",
    "não",
    "Local escolhido, ou referência livre com ao menos 10 caracteres.",
  ],
];

const REQUEST_RESPONSE: [string, string][] = [
  ["id", "UUIDv7 do pedido (`operation_id`)."],
  ["source", "`number` ou `address`."],
  ["product", "`visualizacao`, `inteiro_teor_simples` ou `inteiro_teor`."],
  [
    "status",
    "Estado técnico do pedido: `pending`, `awaiting_input`, `dispatched`, `confirmed`, `unavailable`, `failed` ou `unknown`.",
  ],
  [
    "office_id, notary, office_city, office_state",
    "Cartório escolhido; cidade e UF são do cartório, não do imóvel.",
  ],
  [
    "formatted_address, route, city, state, postal_code …",
    "Endereço citado no original ou informado; só se preenche quando o original confirma.",
  ],
  ["items", "Um item por matrícula, com o próprio estado."],
  [
    "result_complete, attention_count, overall_signal",
    "Andamento e pontos de atenção.",
  ],
  ["created_at", "Quando o pedido foi criado."],
];

export const REGISTRY_ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/v1/partner/registry-requests/number",
    title: "Pedir registro por matrícula ou CNM",
    scope: "registry:submit",
    purpose:
      "Cria o pedido por matrícula local ou CNM, em nome do titular. Não consulta fornecedor, não cota e não cobra.",
    headers: [AUTH, KEY, JSON_TYPE],
    body: {
      caption: "Corpo",
      fields: [
        [
          "product",
          "texto",
          "sim",
          "`visualizacao` (só matrícula local), `inteiro_teor_simples` ou `inteiro_teor` (aceitam CNM).",
        ],
        [
          "office_id",
          "UUIDv7",
          "sim",
          "Cartório escolhido em `GET /v1/registry-offices`.",
        ],
        [
          "registration_numbers",
          "lista",
          "sim",
          "De 1 a 100 matrículas ou CNMs do mesmo cartório, sem repetição.",
        ],
        [
          "address_context",
          "objeto",
          "não",
          "Endereço informado pelo titular, só para exibição, com uma única matrícula. Não prova vínculo nem muda preço.",
        ],
      ],
    },
    response: {
      status: "201",
      text: "O pedido criado, com `Location` para o GET.",
      fields: REQUEST_RESPONSE,
    },
    errors: [
      E401,
      E404,
      E409("A mesma chave foi usada com outro conteúdo ou outra origem."),
      E422,
      ["429", "Limite de pedidos atingido: espere e tente de novo."],
      E503,
    ],
    events: ["registry.created"],
    example: {
      label: "cURL",
      language: "shell",
      code: 'curl --request POST "$API_URL/v1/partner/registry-requests/number" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Idempotency-Key: $(uuidgen)" \\\n  --header "Content-Type: application/json" \\\n  --data \'{"product":"inteiro_teor_simples","office_id":"<OFFICE_ID>","registration_numbers":["12345"]}\'',
    },
  },
  {
    method: "POST",
    path: "/v1/partner/registry-requests/address",
    title: "Pedir registro por endereço",
    scope: "registry:submit",
    purpose:
      "Guarda a intenção por endereço já confirmado pelo titular. A API não resolve nem valida o endereço.",
    headers: [AUTH, KEY, JSON_TYPE],
    body: {
      caption: "Corpo",
      fields: [
        [
          "office_id",
          "UUIDv7",
          "sim",
          "Cartório escolhido em `GET /v1/registry-offices`.",
        ],
        [
          "product",
          "texto",
          "não",
          "Padrão `inteiro_teor_simples`. A visualização exige matrícula local.",
        ],
        [
          "address",
          "objeto",
          "sim",
          "Endereço e respostas explícitas (campos abaixo).",
        ],
      ],
    },
    response: {
      status: "201",
      text: "O pedido criado.",
      fields: REQUEST_RESPONSE,
    },
    errors: [
      E401,
      E404,
      E409("A mesma chave foi usada com outro conteúdo ou outra origem."),
      E422,
      ["429", "Limite de pedidos atingido."],
      E503,
    ],
    events: ["registry.created"],
    notes: [
      "Campos de `address`: " +
        ADDRESS_FIELDS.map(([name, , , text]) => `\`${name}\` (${text})`).join(
          "; ",
        ),
      "Cada detalhe tem um par `without_…`: envie a confirmação explícita em vez de omitir o campo.",
    ],
  },
  {
    method: "GET",
    path: "/v1/partner/registry-requests",
    title: "Listar os pedidos de registro",
    scope: "registry:read",
    purpose:
      "Lista só os pedidos desta aplicação para o titular, do mais novo para o mais antigo, com rótulos para um cartão de lista.",
    headers: [AUTH],
    query: PAGINATION,
    response: {
      status: "200",
      text: "Página de pedidos.",
      fields: [
        ["items", "Pedidos resumidos; `city` e `state` indicam o cartório."],
        ["next_cursor", "Cursor da próxima página; nulo encerra."],
      ],
    },
    errors: [
      E401,
      E404,
      E409("Pedido em estado que impede a leitura."),
      E422,
      ["429", "Limite de consultas atingido."],
      E503,
    ],
  },
  {
    method: "GET",
    path: "/v1/partner/registry-requests/{operation_id}",
    title: "Consultar um pedido de registro",
    scope: "registry:read",
    purpose:
      "Mostra o pedido e o andamento de cada matrícula, sem documento original nem dados de pagamento.",
    headers: [AUTH],
    response: { status: "200", text: "O pedido.", fields: REQUEST_RESPONSE },
    errors: [
      E401,
      E404,
      E409("Pedido em estado que impede a leitura."),
      E422,
      ["429", "Limite de consultas atingido."],
      E503,
    ],
    notes: ["Reconcilie por este GET depois de um timeout."],
    events: [
      "registry.preview.completed",
      "acquisition.submitted",
      "acquisition.completed",
      "acquisition.failed",
    ],
  },
  {
    method: "POST",
    path: "/v1/partner/registry-requests/{operation_id}/preview",
    title: "Consultar o custo (prévia)",
    scope: "registry:preview",
    purpose:
      "Consulta e cancela uma única prévia no RI Digital para este pedido. Não gera cotação, cobrança nem compra.",
    headers: [AUTH],
    response: {
      status: "201",
      text: "Resultado da prévia.",
      fields: [
        ["status", "Estado da prévia."],
        ["observed_items", "Quantos itens foram observados."],
        ["items", "Resultado por item."],
      ],
    },
    errors: [
      E401,
      E404,
      E409(
        "Prévia já feita, resultado incerto (vai para conciliação) ou pedido em outro estado.",
      ),
      E422,
      E503,
    ],
    notes: ["Resultado incerto exige conciliação: não repita a tentativa."],
    events: ["registry.preview.completed"],
  },
  {
    method: "GET",
    path: "/v1/partner/registry-requests/{operation_id}/certificate-options",
    title: "Ver as certidões opcionais do pedido",
    scope: "certificate:read",
    purpose:
      "Lista a disponibilidade comercial atual dos tipos opcionais. Será revalidada na cotação e na execução.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "Opções e quando foram conferidas.",
      fields: [
        ["items", "Tipos e disponibilidade."],
        ["checked_at", "Momento da conferência."],
      ],
    },
    errors: [
      E401,
      E404,
      E409("Pedido ainda sem prévia confirmada."),
      E422,
      E503,
    ],
  },
  {
    method: "POST",
    path: "/v1/partner/registry-requests/{operation_id}/quote",
    title: "Cotar o pedido de registro",
    scope: "registry:quote",
    purpose:
      "Aprova a cotação do pedido. Exige prévia confirmada. Não cria PIX nem compra.",
    headers: [AUTH, JSON_TYPE],
    body: {
      caption: "Corpo (opcional)",
      fields: [
        ["promotion_code", "texto", "não", "Código de cupom."],
        [
          "certificate_selections",
          "lista",
          "não",
          "Uma escolha de tipo por matrícula do pedido.",
        ],
      ],
    },
    response: {
      status: "201",
      text: "Cotação aprovada.",
      fields: [
        ["quote_id", "UUIDv7 da cotação."],
        ["payable_cents", "Valor a pagar em centavos."],
        ["list_price_cents", "Preço público."],
        ["expires_at", "Validade da cotação."],
        ["status", "Estado da cotação."],
        [
          "breakdown, delivery_deadlines",
          "Composição do preço e prazos de entrega.",
        ],
        [
          "quoted_ordinals, unpriced_items",
          "Matrículas cotadas e as sem preço.",
        ],
      ],
    },
    errors: [
      E401,
      E404,
      E409(
        "Sem evidência vigente de prévia, ou cotação já aprovada e com PIX iniciado.",
      ),
      E422,
      E503,
    ],
    events: ["registry.quote.created", "registry.quote.expired"],
  },
  {
    method: "GET",
    path: "/v1/partner/registry-requests/{operation_id}/quote",
    title: "Reler a cotação do registro",
    scope: "registry:quote",
    purpose:
      "Lê a cotação atual. Cotação expirada continua visível, mas não pode ser paga.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "A cotação, com os mesmos campos do POST.",
    },
    errors: [E401, E404, E409("Ainda não há cotação."), E422, E503],
  },
  {
    method: "POST",
    path: "/v1/partner/registry-requests/{operation_id}/pix",
    title: "Gerar o PIX do registro",
    scope: "registry:pay",
    purpose:
      "Cria ou recupera o PIX da cotação aprovada. Valor e vencimento vêm da cotação.",
    headers: [AUTH, JSON_TYPE],
    body: {
      caption: "Corpo",
      fields: [
        ...LEGAL_FIELDS,
        [
          "payer",
          "objeto",
          "não",
          "`{ name, document }`. Se já existir o mesmo pagador, é reutilizado.",
        ],
      ],
    },
    response: { status: "200", text: "A cobrança PIX.", fields: PIX_RESPONSE },
    errors: [
      E401,
      E404,
      E409(
        "Cotação ausente ou expirada, pagador diferente do cadastrado ou aceite desatualizado.",
      ),
      E422,
      E503,
    ],
    events: ["payment.created", "payment.confirmed", "payment.failed"],
  },
  {
    method: "GET",
    path: "/v1/partner/registry-requests/{operation_id}/pix",
    title: "Consultar o PIX do registro",
    scope: "payment:read",
    purpose: "Mostra a cobrança PIX já criada, sem criar outra.",
    headers: [AUTH],
    response: { status: "200", text: "A cobrança PIX.", fields: PIX_RESPONSE },
    errors: [
      E401,
      E404,
      E409("Ainda não há PIX para esta cotação."),
      E422,
      E503,
    ],
  },
  {
    method: "POST",
    path: "/v1/partner/registry-requests/{operation_id}/credits",
    title: "Pagar o registro com créditos",
    scope: "payment:credits",
    purpose:
      "Debita uma única vez o saldo confirmado do titular para a cotação aprovada e despacha o pedido.",
    headers: [AUTH, JSON_TYPE],
    body: { caption: "Corpo", fields: LEGAL_FIELDS },
    response: {
      status: "200",
      text: "O débito feito.",
      fields: CREDITS_RESPONSE,
    },
    errors: [
      E401,
      E404,
      E409("Saldo insuficiente, cotação expirada ou aceite desatualizado."),
      E422,
      E503,
    ],
    events: ["payment.confirmed", "acquisition.submitted"],
    notes: ["A repetição idêntica devolve o mesmo débito."],
  },
];

export const PAYMENT_SUPPORT_ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/v1/partner/payment-options",
    title: "Ver como o titular pode pagar",
    scope: "payment:read",
    purpose:
      "Mostra o saldo de créditos, se há pagador cadastrado e quais meios este token pode usar agora. Serve para montar a tela de pagamento do parceiro. Não cria cobrança nem debita saldo.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "Opções do titular conectado.",
      fields: [
        ["currency", "`BRL`."],
        ["credits.available_cents", "Saldo confirmado em centavos."],
        [
          "payer.registered",
          "`true` se já há pagador salvo, reutilizável no PIX.",
        ],
        [
          "payer.document_kind, payer.document_last4",
          "`cpf` ou `cnpj` e os quatro últimos caracteres; nulos sem pagador. Nome e documento inteiro nunca são devolvidos.",
        ],
        [
          "methods",
          "`pix` (token com `analysis:pay` ou `registry:pay`) e/ou `credits` (token com `payment:credits` e saldo maior que zero).",
        ],
      ],
    },
    errors: [
      E401,
      ["404", "Conexão não encontrada."],
      E409("Pagamentos indisponíveis no momento."),
      E422,
      E503,
    ],
    notes: [
      "`methods` vazio: o titular não tem como pagar por esta integração agora.",
      "Resposta com `Cache-Control: private, no-store`.",
    ],
    example: {
      label: "cURL",
      language: "shell",
      code: 'curl "$API_URL/v1/partner/payment-options" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN"',
    },
  },
  {
    method: "GET",
    path: "/v1/legal/catalog",
    title: "Obter o catálogo jurídico",
    scope: null,
    purpose:
      "Devolve o pacote jurídico vigente. Copie `legal_policy_version` e cada par `version`/`sha256` para o corpo dos pagamentos; não renderize nem calcule hashes. Não autentica o titular nem cria cobrança.",
    response: {
      status: "200",
      text: "O catálogo.",
      fields: [
        ["legal_policy_version", "Versão do pacote exigida no aceite."],
        [
          "documents",
          "Mapa `slug → { version, sha256, url }`; `url` é o caminho público do documento.",
        ],
      ],
    },
    errors: [],
    notes: ["Mostre os documentos ao titular antes de enviar o aceite."],
  },
  {
    method: "GET",
    path: "/v1/registry-offices",
    title: "Buscar cartórios",
    scope: null,
    purpose:
      "Diretório público para achar o `office_id` dos pedidos de registro. É histórico: não confirma serviço nem preço vigentes.",
    query: [
      ["state", "texto", "sim", "UF em maiúsculas, por exemplo `SC`."],
      ["city", "texto", "não", "Parte do nome da cidade."],
      [
        "cns",
        "texto",
        "não",
        "CNS exato; pode identificar mais de um cadastro.",
      ],
      ["search", "texto", "não", "Parte do nome do cartório."],
      ["cursor", "UUIDv7", "não", "`next_cursor` da página anterior."],
      ["limit", "inteiro", "não", "De 1 a 100; padrão 20."],
    ],
    response: {
      status: "200",
      text: "Página de cartórios.",
      fields: [
        [
          "items",
          "`id` (use como `office_id`), `name`, `city`, `state`, `cns`, `cns_ambiguous`, histórico de disponibilidade e custo médio indicativo.",
        ],
        ["next_cursor", "Próxima página; nulo encerra."],
      ],
    },
    errors: [["422", "Filtro, cursor ou limite inválido."], E503],
    notes: [
      "Com `cns_ambiguous`, mostre as opções ao titular e envie o UUID escolhido.",
    ],
  },
  {
    method: "GET",
    path: "/v1/site/availability",
    title: "Ver se há manutenção",
    scope: null,
    purpose:
      "Diz se uma manutenção suspende as entradas públicas agora. Não expõe notas internas.",
    response: {
      status: "200",
      text: "Estado da manutenção.",
      fields: [
        ["maintenance", "`true` durante a manutenção."],
        ["mode", "Modo vigente."],
        ["estimated_return_at", "Previsão de retorno, quando há."],
        ["public_message", "Mensagem pública, quando há."],
      ],
    },
    errors: [E503],
  },
  {
    method: "GET",
    path: "/v1/applications/{application_id}",
    title: "Consultar a própria aplicação",
    scope: "application:read",
    purpose:
      "Confere o `id`, o `name` e o `status` da aplicação dona do token. Outra aplicação responde como não encontrada.",
    headers: [AUTH],
    response: {
      status: "200",
      text: "`{ id, name, status }`, sem dados de usuário.",
    },
    errors: [
      E401,
      ["403", "A aplicação não tem a permissão `application:read`."],
      E404,
      E422,
      E503,
    ],
  },
];

const ORDER_RESPONSE: [string, string][] = [
  [
    "id",
    "`operation_id` (registro) ou `analysis_id` (análise): não existe id novo.",
  ],
  ["kind", "`registry` ou `analysis`."],
  [
    "state",
    "`awaiting_quote`, `awaiting_payment`, `paid`, `processing`, `delivered` ou `failed`.",
  ],
  [
    "next_action",
    "O que fazer agora: `quote` (a cotação ainda não saiu), `pay`, `wait`, `download` ou `none`.",
  ],
  [
    "quote",
    "`{ amount_cents, currency, expires_at }`, ou nulo antes da cotação.",
  ],
  [
    "methods",
    "Meios que este token pode usar agora (`pix` e/ou `credits`); só vem preenchido em `awaiting_payment`.",
  ],
];

export const ORDER_ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/v1/partner/orders",
    title: "Criar a ordem",
    scope: "registry:submit + registry:preview + registry:quote",
    purpose:
      "Cria a ordem, consulta o custo e cota, em uma chamada. Para `source` = `analysis` (arquivo já enviado) o escopo é `analysis:quote`. Não paga nem cobra.",
    headers: [AUTH, KEY, JSON_TYPE],
    body: {
      caption: "Corpo",
      fields: [
        [
          "source",
          "texto",
          "sim",
          "`number` (matrícula ou CNM), `address` (endereço) ou `analysis` (arquivo enviado em `POST /v1/partner/analyses`).",
        ],
        [
          "product",
          "texto",
          "number: sim",
          "`visualizacao`, `inteiro_teor_simples` ou `inteiro_teor`. Em `address` é opcional.",
        ],
        [
          "office_id",
          "UUIDv7",
          "number e address",
          "Cartório de `GET /v1/registry-offices`.",
        ],
        [
          "registration_numbers",
          "lista",
          "number",
          "De 1 a 100 matrículas ou CNMs do mesmo cartório.",
        ],
        [
          "address_context",
          "objeto",
          "não",
          "Só em `number`: endereço informado, para exibição.",
        ],
        [
          "address",
          "objeto",
          "address",
          "Endereço confirmado e respostas `without_*`, como em [Como solicitar](solicitar).",
        ],
        [
          "analysis_id",
          "UUIDv7",
          "analysis",
          "Solicitação criada em `POST /v1/partner/analyses`.",
        ],
      ],
    },
    response: {
      status: "201",
      text: "A ordem, com `Location` para o GET.",
      fields: ORDER_RESPONSE,
    },
    errors: [
      E401,
      E404,
      E409(
        "A chave foi usada com outro conteúdo, ou o passo não é permitido neste estado.",
      ),
      E422,
      E503,
    ],
    notes: [
      "Criar, consultar o custo e cotar rodam em transações separadas: se a prévia ou a cotação falhar, a ordem continua criada e `state` e `next_action` dizem o que fazer.",
      "Repita com a mesma `Idempotency-Key` para recuperar a mesma ordem.",
      "Depois de timeout, reconcilie sempre por `GET /v1/partner/orders/{id}`.",
    ],
    events: ["registry.created", "registry.quote.created"],
    example: {
      label: "cURL",
      language: "shell",
      code: 'curl --request POST "$API_URL/v1/partner/orders" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Idempotency-Key: $(uuidgen)" \\\n  --header "Content-Type: application/json" \\\n  --data \'{"source":"number","product":"inteiro_teor_simples","office_id":"<OFFICE_ID>","registration_numbers":["12345"]}\'',
    },
  },
  {
    method: "GET",
    path: "/v1/partner/orders/{order_id}",
    title: "Consultar a ordem",
    scope: "registry:read + registry:quote",
    purpose:
      "Mostra o estado, a cotação e os meios de pagamento. Para ordens de análise o escopo é `analysis:read` + `analysis:quote`.",
    headers: [AUTH],
    response: { status: "200", text: "A ordem.", fields: ORDER_RESPONSE },
    errors: [E401, E404, E422, E503],
    notes: [
      "É a reconciliação depois de qualquer timeout ou resposta incerta.",
    ],
  },
  {
    method: "POST",
    path: "/v1/partner/orders/{order_id}/payment",
    title: "Pagar a ordem",
    scope: "registry:pay ou payment:credits",
    purpose:
      "Paga a cotação vigente por PIX (`registry:pay`, ou `analysis:pay` em análise) ou por créditos (`payment:credits`). O valor vem da cotação.",
    headers: [AUTH, JSON_TYPE],
    body: {
      caption: "Corpo",
      fields: [
        ["method", "texto", "sim", "`pix` ou `credits`."],
        [
          "accepted",
          "booleano",
          "sim",
          "`true` confirma os documentos de `GET /v1/legal/catalog`; o backend copia as versões e hashes vigentes.",
        ],
        [
          "payer",
          "objeto",
          "não",
          "Só com `pix`: `{ name, document }`, reutilizado se já existir. Com `credits` responde `422`.",
        ],
      ],
    },
    response: {
      status: "200",
      text: "O pagamento e a ordem atualizada.",
      fields: [
        [
          "status",
          "`payment_created` (PIX gerado) ou `paid` (créditos debitados).",
        ],
        [
          "pix",
          "A cobrança PIX, quando `method` é `pix` (campos de [Pagamento](pagamento)).",
        ],
        [
          "credits",
          "O débito, com `balance_cents`, quando `method` é `credits`.",
        ],
        ["order", "A ordem no estado atual."],
      ],
    },
    errors: [
      E401,
      E404,
      E409(
        "Cotação ausente ou expirada, saldo insuficiente, pagador diferente do cadastrado ou resultado incerto.",
      ),
      E422,
      E503,
    ],
    notes: [
      "Resultado incerto não deve ser repetido: consulte `GET /v1/partner/orders/{id}`.",
    ],
    events: ["payment.created", "payment.confirmed", "payment.failed"],
  },
];

export const PARTNER_ENDPOINTS: Endpoint[] = [
  ...ORDER_ENDPOINTS,
  ...ANALYSIS_ENDPOINTS,
  ...REGISTRY_ENDPOINTS,
  ...PAYMENT_SUPPORT_ENDPOINTS,
];
