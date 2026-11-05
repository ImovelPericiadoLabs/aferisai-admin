import type { DocsSite } from "./docs-model";
import { integrationSamples } from "./integration-samples";

const SCOPES: [string, string, string][] = [
  [
    "analysis:submit:upload",
    "Enviar matrícula para análise",
    "Permite solicitar análise de um arquivo em seu nome quando a integração estiver disponível. Não autoriza pagamento automático.",
  ],
  [
    "analysis:read",
    "Consultar suas análises",
    "Permite consultar estado, resultado e baixar o relatório em PDF das suas análises quando a integração estiver disponível. Não permite abrir o arquivo original.",
  ],
  [
    "analysis:quote",
    "Consultar preço de arquivo",
    "Permite cotar arquivos enviados por esta aplicação, inclusive certidões opcionais, sem criar PIX ou pagar automaticamente.",
  ],
  [
    "analysis:pay",
    "Pagar análise por PIX",
    "Permite iniciar ou consultar o PIX de uma cotação aprovada da própria análise, sempre em nome do titular conectado.",
  ],
  [
    "payment:read",
    "Consultar pagamento PIX",
    "Permite consultar o estado e o QR pendente de um PIX criado pela própria aplicação, sem criar nova cobrança.",
  ],
  [
    "registry:submit",
    "Solicitar documento registral",
    "Permite criar um pedido por número, CNM ou endereço em seu nome. Não autoriza cotação, pagamento ou compra automática.",
  ],
  [
    "registry:read",
    "Consultar pedidos registrais",
    "Permite consultar somente pedidos registrais iniciados por esta aplicação em seu nome, sem documento original ou dados de pagamento.",
  ],
  [
    "registry:preview",
    "Consultar prévia registral",
    "Permite executar ou consultar a prévia de custo registral de pedidos iniciados por esta aplicação.",
  ],
  [
    "registry:quote",
    "Consultar preços registrais",
    "Permite obter a prévia de custo no RI Digital e cotar pedidos registrais iniciados por esta aplicação. Não autoriza PIX nem compra.",
  ],
  [
    "certificate:read",
    "Consultar certidões disponíveis",
    "Permite consultar as certidões opcionais disponíveis para uma cotação registral própria.",
  ],
  [
    "registry:pay",
    "Pagar registro por PIX",
    "Permite iniciar ou consultar o PIX de uma cotação registral aprovada da própria aplicação, sempre em nome do titular conectado.",
  ],
  [
    "events:analysis",
    "Receber eventos de análise",
    "Permite enviar ao endpoint da aplicação eventos das análises iniciadas por ela. Não permite consultar resultado ou documento.",
  ],
  [
    "events:registry",
    "Receber eventos registrais",
    "Permite enviar eventos de pedidos, prévias e cotações registrais originados pela aplicação.",
  ],
  [
    "events:payment",
    "Receber eventos de pagamento",
    "Permite enviar eventos de criação, confirmação, falha e estorno de pagamentos ligados à aplicação.",
  ],
  [
    "events:acquisition",
    "Receber eventos de aquisição",
    "Permite enviar eventos do andamento da aquisição externa originada pela aplicação.",
  ],
  [
    "events:certificate",
    "Receber eventos de certidão",
    "Permite enviar eventos de certidões opcionais vinculadas à aplicação.",
  ],
  [
    "events:connection",
    "Receber eventos de conexão",
    "Permite enviar eventos de autorização e revogação da conexão do titular.",
  ],
  [
    "events:credential",
    "Receber eventos de credencial",
    "Permite enviar eventos de emissão e revogação de credenciais da aplicação.",
  ],
  [
    "events:commission",
    "Receber eventos de comissão",
    "Permite enviar eventos de comissão devida ou revertida após os gates financeiros.",
  ],
];

/** Partner documentation (portal "Documentação"). Plain data: see docs-model.ts for the block types. */
export const partnerDocs: DocsSite = {
  title: "Documentação da integração",
  samples: integrationSamples,
  groups: [
    { id: "inicio", label: "Primeiros passos" },
    { id: "integracao", label: "Integração" },
    { id: "eventos", label: "Eventos" },
    { id: "painel", label: "Painel" },
    { id: "referencia", label: "Referência" },
  ],
  pages: [
    {
      id: "comece-aqui",
      group: "inicio",
      title: "Comece aqui",
      summary:
        "Siga a ordem recomendada para colocar a integração em produção.",
      sections: [
        {
          id: "rota",
          title: "Da primeira autorização ao primeiro evento",
          blocks: [
            {
              type: "p",
              text: "A integração começa no backend do parceiro: confirme os acessos, implemente OAuth + PKCE, configure o receptor HTTPS e valide a assinatura antes de ativar eventos reais. Depois, acompanhe as entregas pelo painel e trate retries de forma idempotente.",
            },
            {
              type: "steps",
              items: [
                {
                  title: "Confira os acessos",
                  text: "Valide os escopos concedidos antes de iniciar o fluxo. [Abrir Acessos e escopos](acessos)",
                },
                {
                  title: "Conecte com OAuth",
                  text: "Use state, PKCE e troque o `code` somente no backend. [Ler OAuth e PKCE](oauth)",
                },
                {
                  title: "Ligue os webhooks",
                  text: "Cadastre um endpoint HTTPS, escolha eventos e valide a assinatura. [Ler Webhooks](webhooks)",
                },
                {
                  title: "Monitore entregas",
                  text: "Responda 2xx, deduplique por `id` do evento e investigue retries. [Ler Entregas](entregas)",
                },
              ],
            },
          ],
        },
        {
          id: "antes-de-comecar",
          title: "Antes de começar",
          blocks: [
            {
              type: "list",
              items: [
                "Uma aplicação ativa na sua organização, em **Integrações**. [Ver Aplicações](aplicacoes)",
                "Uma credencial emitida para a aplicação: o `client_id` e o segredo. [Ver Credenciais](credenciais)",
                "Os escopos de que a integração precisa, concedidos pela equipe Aferis. [Ver Acessos e escopos](acessos)",
                "Um servidor seu, com HTTPS, para guardar segredos e receber webhooks.",
              ],
            },
            {
              type: "callout",
              tone: "warning",
              title: "Segredos ficam no backend",
              text: "O fluxo acontece no servidor do parceiro. Nunca coloque `client_secret`, tokens, `code_verifier` ou `code` no navegador, em repositório ou em log.",
            },
          ],
        },
        {
          id: "exemplos",
          title: "Exemplos de código",
          blocks: [
            {
              type: "p",
              text: "Os exemplos do guia estão em cURL, Node.js, Python, Java, C# e Go. Escolha a sua linguagem em qualquer exemplo: a escolha vale para o guia inteiro e fica guardada neste navegador.",
            },
            {
              type: "links",
              items: [
                {
                  to: "oauth",
                  title: "OAuth e PKCE",
                  text: "Autentique o titular com segurança.",
                },
                {
                  to: "ordens",
                  title: "Operação pela API",
                  text: "Crie e acompanhe pedidos registrais.",
                },
                {
                  to: "webhooks",
                  title: "Webhooks",
                  text: "Receba eventos e valide a assinatura.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "organizacao-e-sessao",
      group: "inicio",
      title: "Organização e sessão",
      summary: "Troque de empresa e entenda o contexto ativo do painel.",
      sections: [
        {
          id: "empresa-ativa",
          title: "Empresa ativa e papel da sessão",
          blocks: [
            {
              type: "p",
              text: "O topo do painel mostra a empresa ativa, o usuário conectado e o papel da sessão. Quando uma pessoa participa de mais de uma empresa, o seletor permite trocar a organização; todas as aplicações, métricas, pessoas e extratos são revalidados para a empresa selecionada.",
            },
          ],
        },
      ],
    },
    {
      id: "aplicacoes",
      group: "inicio",
      title: "Aplicações e visão geral",
      summary: "Consulte o estado e abra cada integração da organização.",
      sections: [
        {
          id: "aplicacoes-da-organizacao",
          title: "Aplicações da organização",
          blocks: [
            {
              type: "p",
              text: "Em Integrações, o parceiro visualiza as aplicações da organização, seu nome e estado (ativa ou suspensa). Ao abrir uma aplicação, a Visão geral reúne a identidade da integração, atividade recente e os sinais operacionais disponíveis para a sessão.",
            },
          ],
        },
      ],
    },
    {
      id: "credenciais",
      group: "integracao",
      title: "Credenciais",
      summary: "Emita, consulte e revogue credenciais da aplicação.",
      audience: ["Proprietário", "Desenvolvedor"],
      sections: [
        {
          id: "administrar",
          title: "Administrar credenciais",
          blocks: [
            {
              type: "p",
              text: "A aba Credenciais permite ao proprietário ou desenvolvedor administrar credenciais da aplicação, conferir estado, validade e escopos e revogar uma chave. O segredo é apresentado somente no momento permitido; armazene-o no backend e nunca no navegador, repositório ou log.",
            },
            {
              type: "callout",
              tone: "warning",
              title: "O segredo aparece uma vez",
              text: "Se o segredo se perder, revogue a credencial e emita outra. Ele não pode ser consultado de novo.",
            },
          ],
        },
        {
          id: "onde-usar",
          title: "Onde a credencial é usada",
          blocks: [
            {
              type: "p",
              text: "O `client_id` e o segredo da credencial ativa identificam a aplicação no endpoint de token, em HTTP Basic. Veja [OAuth e PKCE](oauth#troque-o-code).",
            },
          ],
        },
      ],
    },
    {
      id: "oauth",
      group: "integracao",
      title: "OAuth e PKCE",
      summary: "Use a aplicação para autenticar o titular com segurança.",
      audience: ["Desenvolvedor"],
      sections: [
        {
          id: "fluxo",
          title: "Como o fluxo funciona",
          blocks: [
            {
              type: "p",
              text: "O painel fornece o contexto da integração; o fluxo OAuth acontece no produto do parceiro. Gere `state`, `code_verifier` e `code_challenge` no backend. Use `scope=all` para solicitar todos os escopos delegáveis da credencial; o titular ainda aprova a lista expandida. Redirecione o navegador para a Aferis, confira o `state` no retorno e troque o `code` por um token delegado somente no servidor.",
            },
            {
              type: "steps",
              items: [
                {
                  title: "Gere state e PKCE",
                  text: "No servidor, crie um `state` aleatório e o par verificador e desafio PKCE.",
                },
                {
                  title: "Abra a autorização",
                  text: "Envie o titular a `/oauth/authorize`. A Aferis valida o pedido e abre a tela de consentimento.",
                },
                {
                  title: "Receba o retorno",
                  text: "O titular volta à sua URL de retorno. Confira se o `state` é o que você guardou.",
                },
                {
                  title: "Troque o code",
                  text: "No servidor, troque o `code` por um token em `/oauth/token`.",
                },
              ],
            },
          ],
        },
        {
          id: "gere-state-e-pkce",
          title: "1. Gere state e PKCE",
          blocks: [
            {
              type: "p",
              text: "O `state` deve ser aleatório e ter ao menos 16 caracteres. O `code_challenge` é o SHA-256 do `code_verifier`, em Base64url sem preenchimento (43 caracteres). Só o método `S256` é aceito.",
            },
            { type: "samples", id: "oauth-authorize" },
            {
              type: "callout",
              tone: "note",
              text: "Guarde o `state` e o `code_verifier` na sessão do titular, no servidor, até o retorno. O `code_verifier` é enviado de novo na troca do `code`.",
            },
          ],
        },
        {
          id: "abra-a-autorizacao",
          title: "2. Abra a autorização",
          blocks: [
            {
              type: "p",
              text: "O titular é enviado a `GET /oauth/authorize` com os parâmetros abaixo. O servidor valida a aplicação, as concessões e a URL de retorno por igualdade exata e encaminha para a tela de consentimento; nenhum código é emitido nesta chamada.",
            },
            {
              type: "table",
              caption: "Parâmetros de /oauth/authorize",
              columns: ["Parâmetro", "Valor"],
              rows: [
                ["`response_type`", "Sempre `code`."],
                ["`client_id`", "ID público da credencial ativa da aplicação."],
                [
                  "`redirect_uri`",
                  "URL de retorno cadastrada, escrita exatamente igual.",
                ],
                [
                  "`scope`",
                  "Escopos separados por espaço, ou `all` para solicitar todos os escopos delegáveis da credencial.",
                ],
                [
                  "`state`",
                  "Valor aleatório, de 16 a 256 caracteres, que você confere no retorno.",
                ],
                [
                  "`code_challenge`",
                  "SHA-256 do verificador em Base64url, com 43 caracteres.",
                ],
                ["`code_challenge_method`", "Sempre `S256`."],
              ],
            },
            {
              type: "callout",
              tone: "note",
              text: "Parâmetros inválidos ficam na API e nunca redirecionam o titular para uma URL que não esteja cadastrada. A resposta é 400, 404, 422 ou 503.",
            },
          ],
        },
        {
          id: "troque-o-code",
          title: "3. Troque o code por um token",
          blocks: [
            {
              type: "p",
              text: "No retorno, confira o `state` e troque o `code` em `POST /oauth/token`. Autentique com o `client_id` e o segredo em HTTP Basic e envie o corpo como formulário (`application/x-www-form-urlencoded`), sempre por HTTPS.",
            },
            { type: "samples", id: "oauth-token" },
            {
              type: "code",
              language: "json",
              label: "Resposta",
              code: '{\n  "access_token": "…",\n  "token_type": "Bearer",\n  "expires_in": 900,\n  "scope": "registry:submit registry:read"\n}',
            },
            {
              type: "callout",
              tone: "warning",
              title: "Token de 15 minutos, sem refresh",
              text: "O token dura 15 minutos (`expires_in` em segundos) e não há refresh token. Envie-o no cabeçalho `Authorization: Bearer`. O `scope` vem só no token delegado.",
            },
          ],
        },
        {
          id: "token-da-aplicacao",
          title: "Token só da aplicação",
          blocks: [
            {
              type: "p",
              text: "Com `grant_type=client_credentials` o endpoint devolve um token que identifica apenas a aplicação, sem representar um usuário nem o consentimento dele. Não envie `scope` nesse caso.",
            },
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'API_URL="https://api.aferis.ai"\ncurl --request POST "$API_URL/oauth/token" \\\n  --user "$CLIENT_ID:$CLIENT_SECRET" \\\n  --data-urlencode "grant_type=client_credentials"',
            },
          ],
        },
        {
          id: "erros-do-token",
          title: "Erros do endpoint de token",
          blocks: [
            {
              type: "p",
              text: "Este endpoint responde no formato OAuth, com um campo `error`. As demais rotas usam Problem Details, descrito em [Erros e segurança](seguranca).",
            },
            {
              type: "table",
              caption: "Códigos de erro de /oauth/token",
              columns: ["Status", "`error`", "Quando acontece"],
              rows: [
                [
                  "400",
                  "`invalid_request`",
                  "Formulário ausente, malformado ou com campos a mais ou a menos.",
                ],
                [
                  "400",
                  "`unsupported_grant_type`",
                  "O `grant_type` não é `client_credentials` nem `authorization_code`.",
                ],
                [
                  "400",
                  "`invalid_scope`",
                  "Foi enviado `scope` na troca `client_credentials`.",
                ],
                [
                  "400",
                  "`invalid_grant`",
                  "O `code`, a URL de retorno ou o verificador não foram aceitos.",
                ],
                [
                  "401",
                  "`invalid_client`",
                  "`client_id` ou segredo ausentes ou inválidos.",
                ],
                [
                  "503",
                  "`temporarily_unavailable`",
                  "Autenticação temporariamente indisponível; tente de novo.",
                ],
              ],
            },
          ],
        },
      ],
    },
    {
      id: "acessos",
      group: "integracao",
      title: "Acessos e escopos",
      summary: "Veja as permissões concedidas à aplicação.",
      sections: [
        {
          id: "matriz",
          title: "Matriz de escopos",
          blocks: [
            {
              type: "p",
              text: "A aba Acessos mostra os escopos reais da aplicação: análise (leitura, envio, cotação e PIX), registro (envio, leitura, prévia, cotação e PIX), certidões, pagamento (leitura e créditos) e eventos de análise, registro, pagamento, aquisição, certidão, conexão, credencial e comissão. No painel parceiro a consulta é somente leitura; a API revalida organização, aplicação e consentimento em cada operação.",
            },
          ],
        },
        {
          id: "escopos-disponiveis",
          title: "Escopos disponíveis",
          blocks: [
            {
              type: "p",
              text: "Peça no parâmetro `scope` apenas o que a integração usa. O token carrega os escopos aprovados pelo titular.",
            },
            {
              type: "table",
              caption: "Escopos delegados",
              columns: ["Escopo", "Nome", "O que permite"],
              rows: SCOPES.map(([code, name, text]) => [
                `\`${code}\``,
                name,
                text,
              ]),
            },
          ],
        },
      ],
    },
    {
      id: "ordens",
      group: "integracao",
      title: "Operação pela API",
      summary: "Crie e acompanhe pedidos autorizados pelo produto do parceiro.",
      audience: ["Desenvolvedor"],
      scopes: ["registry:submit", "registry:read"],
      sections: [
        {
          id: "visao",
          title: "Como funciona",
          blocks: [
            {
              type: "p",
              text: "O POST cria a intenção do pedido em nome do titular conectado. Ele não consulta fornecedor, não cota e não cobra. Guarde o `operation_id` e acompanhe por GET ou por webhook.",
            },
            {
              type: "callout",
              tone: "note",
              text: "Cada chamada exige um token delegado com o escopo da operação: `registry:submit` para criar e `registry:read` para consultar. Veja como obter o token em [OAuth e PKCE](oauth).",
            },
          ],
        },
        {
          id: "criar-e-consultar",
          title: "Criar e consultar um pedido",
          blocks: [
            { type: "samples", id: "create-request" },
            {
              type: "table",
              caption: "Corpo de POST /v1/partner/registry-requests/number",
              columns: ["Campo", "Descrição"],
              rows: [
                [
                  "`product`",
                  "`visualizacao`, `inteiro_teor_simples` ou `inteiro_teor`. A visualização aceita somente matrícula local; CNM exige um produto de inteiro teor.",
                ],
                [
                  "`office_id`",
                  "UUIDv7 exato do cartório escolhido no diretório.",
                ],
                [
                  "`registration_numbers`",
                  "De 1 a 100 matrículas locais ou CNMs do mesmo cartório, sem repetição.",
                ],
                [
                  "`address_context`",
                  "Opcional. Endereço informado pelo titular, para exibição, quando há uma só matrícula. Não comprova vínculo com o registro nem muda fornecedor ou preço.",
                ],
              ],
            },
            {
              type: "p",
              text: "A resposta é `201` com o pedido e o cabeçalho `Location` apontando para `GET /v1/partner/registry-requests/{id}`. O campo `status` é o estado técnico do pedido: consulte de novo pelo id para acompanhar.",
            },
          ],
        },
        {
          id: "idempotencia",
          title: "Idempotência",
          blocks: [
            {
              type: "p",
              text: "Envie um `Idempotency-Key` UUIDv7 novo para cada pedido novo e guarde-o antes de enviar. Se a resposta se perder, reenvie o mesmo corpo com a mesma chave: na mesma origem, o servidor recupera o pedido já criado em vez de criar outro.",
            },
            {
              type: "callout",
              tone: "warning",
              title: "Nunca troque a chave de um pedido já enviado",
              text: "Uma chave nova cria outro pedido. Reutilizar a chave com outro conteúdo, ou vinda de outra origem, responde 409.",
            },
          ],
        },
        {
          id: "erros-da-operacao",
          title: "Erros desta operação",
          blocks: [
            {
              type: "table",
              caption: "Respostas de erro",
              columns: ["Status", "Significado"],
              rows: [
                [
                  "401",
                  "Token ausente, expirado, revogado ou sem o escopo atual.",
                ],
                [
                  "404",
                  "Pedido ou cartório não encontrado para esta aplicação e titular.",
                ],
                [
                  "409",
                  "Chave de idempotência já usada por outra entrada ou origem.",
                ],
                ["422", "Produto, número, endereço ou identificador inválido."],
                [
                  "429",
                  "Limite diário de matrículas do titular atingido; consulte o cabeçalho `Retry-After`.",
                ],
                ["503", "Serviço temporariamente indisponível."],
              ],
            },
          ],
        },
      ],
    },
    {
      id: "solicitar",
      group: "integracao",
      title: "Como solicitar",
      summary:
        "Por documento, matrícula, CNM ou endereço: escolha a entrada certa.",
      scopes: ["analysis:submit:upload", "registry:submit"],
      sections: [
        {
          id: "qual-entrada",
          title: "Qual entrada usar",
          blocks: [
            {
              type: "p",
              text: "Há duas famílias de solicitação. Com o **arquivo da matrícula em mãos**, use a análise (`/v1/partner/analyses`). Sem o arquivo, peça o **registro** ao cartório (`/v1/partner/registry-requests`), por número ou por endereço.",
            },
            {
              type: "table",
              caption: "Formas de solicitar",
              columns: ["Você tem", "Rota", "Escopo", "Depois"],
              rows: [
                [
                  "O PDF ou imagem da matrícula",
                  "`POST /v1/partner/analyses`",
                  "`analysis:submit:upload`",
                  "Cotar, pagar e ler o resultado",
                ],
                [
                  "O número da matrícula",
                  "`POST /v1/partner/registry-requests/number`",
                  "`registry:submit`",
                  "Prévia, cotação e pagamento",
                ],
                [
                  "O CNM (matrícula nacional)",
                  "`POST /v1/partner/registry-requests/number`",
                  "`registry:submit`",
                  "Igual ao número; exige inteiro teor",
                ],
                [
                  "Só o endereço do imóvel",
                  "`POST /v1/partner/registry-requests/address`",
                  "`registry:submit`",
                  "Prévia, cotação e pagamento",
                ],
              ],
            },
            {
              type: "callout",
              tone: "note",
              text: "Criar a solicitação nunca consulta fornecedor, cota ou cobra. É sempre o primeiro passo; o preço só aparece na cotação.",
            },
          ],
        },
        {
          id: "por-documento",
          title: "Por documento (arquivo)",
          blocks: [
            {
              type: "p",
              text: "Envie o arquivo como **corpo binário único** (não use multipart). Tipos aceitos: `application/pdf`, `image/png` e `image/jpeg`, até 200 MB. O `Content-Type` deve ser exatamente um desses e o `Idempotency-Key` um UUIDv7 canônico.",
            },
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'curl --request POST "$API_URL/v1/partner/analyses" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Idempotency-Key: $(uuidgen)" \\\n  --header "Content-Type: application/pdf" \\\n  --data-binary @matricula.pdf',
            },
            {
              type: "code",
              language: "json",
              label: "Resposta 201",
              code: '{\n  "id": "0192f3a8-…",\n  "state": "awaiting_quote"\n}',
            },
            {
              type: "p",
              text: "`state` é `awaiting_quote` quando o arquivo foi admitido e já pode ser cotado, ou `source_not_eligible` quando o tipo está fora da oferta e não pode ser cobrado. A resposta traz `Location` para consultar o estado. Repetir o mesmo envio com a mesma chave responde `303` para o estado atual.",
            },
            {
              type: "table",
              caption: "Erros do envio",
              columns: ["Status", "Quando"],
              rows: [
                [
                  "`401`",
                  "Token revogado ou expirado, inclusive durante o envio. Nada é criado.",
                ],
                ["`409`", "A mesma chave foi usada por outra origem."],
                ["`413`", "Arquivo maior que 200 MB."],
                ["`415`", "Tipo de arquivo não aceito."],
                [
                  "`422`",
                  "Arquivo vazio, chave que não é UUIDv7 canônico ou arquivo incompatível.",
                ],
                [
                  "`503`",
                  "Envio ocupado ou capacidade temporária; tente de novo com a mesma chave.",
                ],
              ],
            },
          ],
        },
        {
          id: "achar-cartorio",
          title: "Achar o cartório",
          blocks: [
            {
              type: "p",
              text: "Os pedidos de registro pedem o `office_id` (UUIDv7) do cartório. Busque no diretório público, que não precisa de token: `GET /v1/registry-offices?state=SC&city=Florianópolis`. Os filtros são `state` (UF, obrigatório), `city`, `cns`, `search` (nome), `cursor` e `limit` (1 a 100).",
            },
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'curl "$API_URL/v1/registry-offices?state=SC&city=Florian%C3%B3polis&limit=20"',
            },
            {
              type: "callout",
              tone: "warning",
              text: "O diretório é histórico: não confirma serviço nem preço vigentes. Um CNS pode pertencer a mais de um cadastro (`cns_ambiguous`); mostre as opções ao titular e envie o UUID escolhido.",
            },
          ],
        },
        {
          id: "por-matricula",
          title: "Por número de matrícula ou CNM",
          blocks: [
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'curl --request POST "$API_URL/v1/partner/registry-requests/number" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Idempotency-Key: $(uuidgen)" \\\n  --header "Content-Type: application/json" \\\n  --data \'{\n    "product": "inteiro_teor_simples",\n    "office_id": "<OFFICE_ID>",\n    "registration_numbers": ["12345"]\n  }\'',
            },
            {
              type: "list",
              items: [
                "`product`: `visualizacao`, `inteiro_teor_simples` ou `inteiro_teor`.",
                "`registration_numbers`: de 1 a 100 itens do **mesmo cartório**, sem repetição.",
                "A visualização aceita só matrícula local. Para informar um CNM, use um produto de inteiro teor.",
                "`address_context` (opcional, uma só matrícula): o endereço que o titular informou, só para exibição. Não prova vínculo com o registro e não muda fornecedor nem preço.",
              ],
            },
          ],
        },
        {
          id: "por-endereco",
          title: "Por endereço",
          blocks: [
            {
              type: "p",
              text: "Use quando o titular não sabe a matrícula. Envie o endereço **já confirmado por ele** e as respostas explícitas do formulário. A API não resolve nem valida o endereço: ela guarda a intenção.",
            },
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'curl --request POST "$API_URL/v1/partner/registry-requests/address" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Idempotency-Key: $(uuidgen)" \\\n  --header "Content-Type: application/json" \\\n  --data \'{\n    "office_id": "<OFFICE_ID>",\n    "product": "inteiro_teor_simples",\n    "address": {\n      "line": "Rua das Flores, 100, Centro",\n      "postal_code": "89360-730",\n      "number": "100",\n      "registration_unknown": true,\n      "without_allotment": true,\n      "without_block": true,\n      "without_lot": true\n    }\n  }\'',
            },
            {
              type: "table",
              caption: "Campos de address",
              columns: ["Campo", "Descrição"],
              rows: [
                [
                  "`line`",
                  "Obrigatório. Endereço confirmado pelo titular (3 a 500 caracteres).",
                ],
                [
                  "`postal_code`",
                  "CEP no formato `89360-730`. Obrigatório para a prévia e a cotação por endereço no RI Digital.",
                ],
                [
                  "`number` / `without_number`",
                  "Número predial, ou a confirmação de que o endereço não tem número.",
                ],
                [
                  "`registration_number` / `registration_unknown`",
                  "Matrícula conhecida, ou a confirmação de que o titular não sabe.",
                ],
                [
                  "`allotment` / `without_allotment`",
                  "Loteamento, ou a confirmação de que não há.",
                ],
                [
                  "`block` / `without_block`",
                  "Quadra, ou a confirmação de que não há.",
                ],
                [
                  "`lot` / `without_lot`",
                  "Lote, ou a confirmação de que não há.",
                ],
                ["`complement`", "Complemento livre (até 120 caracteres)."],
                [
                  "`place_id` / `location_hint`",
                  "Identificador de local escolhido, ou uma referência livre com ao menos 10 caracteres quando não houver `place_id`.",
                ],
              ],
            },
            {
              type: "callout",
              tone: "tip",
              text: 'Cada campo de detalhe tem um par `without_…`. Mande a confirmação explícita em vez de omitir o campo: é o que distingue "não existe" de "não perguntei".',
            },
          ],
        },
        {
          id: "depois-de-criar",
          title: "Depois de criar",
          blocks: [
            {
              type: "p",
              text: "A resposta `201` traz o pedido, com `id`, `status`, `product`, `office_id`, `notary` e um rótulo de endereço. O `status` é técnico: consulte `GET /v1/partner/registry-requests/{id}` ou assine os eventos de registro. Os campos `route`, `city`, `state` e `postal_code` só são preenchidos quando o original confirma o dado; `city` e `state` do cartório ficam em `office_city` e `office_state`.",
            },
            {
              type: "steps",
              items: [
                {
                  title: "Consultar o custo",
                  text: "`POST …/{id}/preview`, uma única vez.",
                },
                {
                  title: "Cotar",
                  text: "`POST …/{id}/quote`, com certidões opcionais se houver.",
                },
                {
                  title: "Pagar",
                  text: "PIX ou créditos, como em [Pagamento](pagamento).",
                },
              ],
            },
            {
              type: "p",
              text: "Para a análise por documento, o caminho é cotar em `…/quotes`, pagar e ler o resultado. Veja [Análise de matrícula](analises-api).",
            },
          ],
        },
      ],
    },
    {
      id: "referencia-api",
      group: "integracao",
      title: "Referência de endpoints",
      summary: "Todas as rotas públicas de parceiro, com método e escopo.",
      sections: [
        {
          id: "como-ler",
          title: "Como ler esta tabela",
          blocks: [
            {
              type: "p",
              text: "Todas as rotas ficam sob `/v1/partner` e exigem `Authorization: Bearer` com o token delegado obtido por [OAuth e PKCE](oauth). Cada rota pede um escopo próprio; a API só enxerga recursos que a sua aplicação iniciou para o titular conectado. Qualquer outro recurso responde `404`.",
            },
            {
              type: "callout",
              tone: "note",
              text: "A fachada simplificada `/v1/partner/orders` ainda não está publicada. Hoje o fluxo é: enviar, cotar, pagar (PIX ou créditos) e consultar, pelas rotas abaixo.",
            },
          ],
        },
        {
          id: "analises-tabela",
          title: "Análise de matrícula em arquivo",
          blocks: [
            {
              type: "table",
              caption: "Rotas de análise",
              columns: ["Método e rota", "Escopo", "Para quê"],
              rows: [
                [
                  "`POST /v1/partner/analyses`",
                  "`analysis:submit:upload`",
                  "Enviar PDF, PNG ou JPEG (corpo binário, até 200 MB).",
                ],
                [
                  "`GET /v1/partner/analyses`",
                  "`analysis:read`",
                  "Listar as análises criadas pela aplicação.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}`",
                  "`analysis:read`",
                  "Ver estado e disponibilidade.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/certificate-options`",
                  "`analysis:quote`",
                  "Ver certidões opcionais disponíveis.",
                ],
                [
                  "`POST /v1/partner/analyses/{id}/quotes`",
                  "`analysis:quote`",
                  "Aprovar o preço (e certidões opcionais).",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/quotes`",
                  "`analysis:quote`",
                  "Reler a cotação aprovada.",
                ],
                [
                  "`POST /v1/partner/analyses/{id}/pix`",
                  "`analysis:pay`",
                  "Gerar o PIX da cotação.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/pix`",
                  "`payment:read`",
                  "Consultar o PIX criado.",
                ],
                [
                  "`POST /v1/partner/analyses/{id}/credits`",
                  "`payment:credits`",
                  "Pagar com créditos.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/result`",
                  "`analysis:read`",
                  "Ler as menções factuais do resultado.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/report.pdf`",
                  "`analysis:read`",
                  "Baixar o relatório em PDF.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/complete.pdf`",
                  "`analysis:read`",
                  "Baixar o dossiê completo em PDF.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/original`",
                  "`analysis:read`",
                  "Baixar o arquivo original.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/certificates`",
                  "`analysis:read`",
                  "Listar as certidões compradas.",
                ],
                [
                  "`GET /v1/partner/analyses/{id}/certificates/{task_id}/document`",
                  "`analysis:read`",
                  "Baixar o PDF de uma certidão.",
                ],
              ],
            },
          ],
        },
        {
          id: "registro-tabela",
          title: "Pedido de registro",
          blocks: [
            {
              type: "table",
              caption: "Rotas de pedido registral",
              columns: ["Método e rota", "Escopo", "Para quê"],
              rows: [
                [
                  "`POST /v1/partner/registry-requests/number`",
                  "`registry:submit`",
                  "Pedir por matrícula ou CNM.",
                ],
                [
                  "`POST /v1/partner/registry-requests/address`",
                  "`registry:submit`",
                  "Pedir por endereço confirmado.",
                ],
                [
                  "`GET /v1/partner/registry-requests`",
                  "`registry:read`",
                  "Listar pedidos (paginação por `next_cursor`).",
                ],
                [
                  "`GET /v1/partner/registry-requests/{id}`",
                  "`registry:read`",
                  "Consultar um pedido.",
                ],
                [
                  "`POST /v1/partner/registry-requests/{id}/preview`",
                  "`registry:preview`",
                  "Consultar o custo (uma única prévia).",
                ],
                [
                  "`GET /v1/partner/registry-requests/{id}/certificate-options`",
                  "`certificate:read`",
                  "Ver certidões opcionais.",
                ],
                [
                  "`POST /v1/partner/registry-requests/{id}/quote`",
                  "`registry:quote`",
                  "Aprovar a cotação.",
                ],
                [
                  "`GET /v1/partner/registry-requests/{id}/quote`",
                  "`registry:quote`",
                  "Reler a cotação.",
                ],
                [
                  "`POST /v1/partner/registry-requests/{id}/pix`",
                  "`registry:pay`",
                  "Gerar o PIX da cotação.",
                ],
                [
                  "`GET /v1/partner/registry-requests/{id}/pix`",
                  "`payment:read`",
                  "Consultar o PIX criado.",
                ],
                [
                  "`POST /v1/partner/registry-requests/{id}/credits`",
                  "`payment:credits`",
                  "Pagar com créditos e despachar.",
                ],
              ],
            },
          ],
        },
      ],
    },
    {
      id: "analises-api",
      group: "integracao",
      title: "Análise de matrícula",
      summary: "Envie o arquivo, cote, pague e leia o resultado.",
      scopes: [
        "analysis:submit:upload",
        "analysis:quote",
        "analysis:pay",
        "analysis:read",
      ],
      sections: [
        {
          id: "enviar-arquivo",
          title: "1. Enviar o arquivo",
          blocks: [
            {
              type: "p",
              text: "Envie o PDF, PNG ou JPEG como **corpo binário único** (até 200 MB), com `Content-Type` do arquivo e um `Idempotency-Key` UUIDv7. A resposta cria uma solicitação aguardando cotação. Uma repetição idêntica pela mesma conexão redireciona (`303`) para o estado atual; a mesma chave em outra origem responde `409`.",
            },
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'curl --request POST "$API_URL/v1/partner/analyses" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Idempotency-Key: $(uuidgen)" \\\n  --header "Content-Type: application/pdf" \\\n  --data-binary @matricula.pdf',
            },
          ],
        },
        {
          id: "cotar-analise",
          title: "2. Cotar",
          blocks: [
            {
              type: "p",
              text: "Antes de cotar, `GET …/certificate-options` mostra as certidões opcionais disponíveis. O `POST …/quotes` aprova o preço de arquivos de até três páginas. O corpo é opcional: `promotion_code` e `certificate_selections` (um item por tipo, no máximo 9). Cotar não cria PIX, não debita créditos e não compra nada.",
            },
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'curl --request POST "$API_URL/v1/partner/analyses/$ANALYSIS_ID/quotes" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Content-Type: application/json" \\\n  --data \'{"certificate_selections": []}\'',
            },
          ],
        },
        {
          id: "pagar-analise",
          title: "3. Pagar",
          blocks: [
            {
              type: "p",
              text: "Pague a cotação aprovada por PIX ou créditos. Veja os corpos em [Pagamento](pagamento).",
            },
          ],
        },
        {
          id: "ler-resultado",
          title: "4. Ler o resultado",
          blocks: [
            {
              type: "p",
              text: "`GET …/{id}` devolve só estado e disponibilidade. Depois do pagamento recebido e da conclusão técnica, `…/result` traz as menções factuais preliminares. Os downloads `report.pdf`, `complete.pdf` (relatório, original e certidões, nessa ordem) e `original` exigem `analysis:read`.",
            },
            {
              type: "callout",
              tone: "warning",
              text: "O resultado não é laudo jurídico nem prova de regularidade. `client_credentials` não é aceito nestas rotas.",
            },
            {
              type: "p",
              text: "`GET …/certificates` lista as certidões compradas e `unavailable_kinds` mostra tipos sem titular identificado; `…/certificates/{task_id}/document` baixa o PDF validado.",
            },
          ],
        },
      ],
    },
    {
      id: "registro-api",
      group: "integracao",
      title: "Pedido de registro: cotar",
      summary: "Prévia de custo, certidões e cotação do pedido.",
      scopes: ["registry:preview", "certificate:read", "registry:quote"],
      sections: [
        {
          id: "criar-pedido",
          title: "Criar por matrícula ou endereço",
          blocks: [
            {
              type: "p",
              text: "`POST …/number` recebe `product` (`visualizacao`, `inteiro_teor_simples` ou `inteiro_teor`), `office_id` (UUIDv7 do cartório) e `registration_numbers` (1 a 100, sem duplicatas). Visualização aceita só matrícula local; CNM exige um produto de inteiro teor. `address_context` é opcional e só serve para exibição.",
            },
            {
              type: "p",
              text: "`POST …/address` recebe `office_id`, `product` e `address` (`line` e as respostas explícitas do formulário, como `without_number` e `registration_unknown`). Nada disso consulta fornecedor, cota ou cobra. Ambos exigem `Idempotency-Key`.",
            },
          ],
        },
        {
          id: "previa-e-cotacao",
          title: "Prévia, certidões e cotação",
          blocks: [
            {
              type: "steps",
              items: [
                {
                  title: "Prévia de custo",
                  text: "`POST …/{id}/preview` consulta o custo uma única vez. Se o resultado for incerto, não repita: o caso vai para conciliação.",
                },
                {
                  title: "Certidões opcionais",
                  text: "`GET …/{id}/certificate-options` lista a disponibilidade atual. Uma opção disponível ainda é revalidada na cotação.",
                },
                {
                  title: "Cotação",
                  text: "`POST …/{id}/quote` aprova o preço e exige prévia confirmada. Corpo opcional: `promotion_code` e `certificate_selections` (uma escolha por matrícula). Sem evidência vigente responde `409`.",
                },
              ],
            },
            {
              type: "callout",
              tone: "note",
              text: "Cotação expirada continua visível em `GET …/{id}/quote`, mas não pode ser paga.",
            },
          ],
        },
      ],
    },
    {
      id: "pagamento",
      group: "integracao",
      title: "Pagamento: PIX e créditos",
      summary: "Gere o PIX, use créditos e consulte a cobrança.",
      scopes: [
        "analysis:pay",
        "registry:pay",
        "payment:credits",
        "payment:read",
      ],
      sections: [
        {
          id: "regras",
          title: "Regras do pagamento delegado",
          blocks: [
            {
              type: "list",
              items: [
                "O valor e o vencimento vêm sempre da cotação aprovada; o parceiro não escolhe nenhum dos dois.",
                "PIX e créditos são pagos em nome do titular conectado.",
                "`payment:credits` debita uma única vez o saldo confirmado e não autoriza PIX, recarga, cartão ou 3DS.",
                "Cartão, débito e desafios 3DS ficam somente no checkout da plataforma AferisAI.",
                "Resultado externo incerto não gera novo POST: consulte pelo GET.",
              ],
            },
          ],
        },
        {
          id: "corpo-juridico",
          title: "Confirmação jurídica no corpo",
          blocks: [
            {
              type: "p",
              text: "Todo POST de pagamento leva a confirmação do que o titular leu: `legal_policy_version` e, em `documents`, uma entrada por documento (`politica-de-privacidade`, `termos-de-servico`, `politica-de-cancelamento-e-reembolso`, `exclusao-de-dados` e `aviso-de-cookies`) com `version` e o `sha256` do texto exibido.",
            },
            {
              type: "code",
              language: "json",
              code: '{\n  "legal_policy_version": "2.0",\n  "documents": {\n    "termos-de-servico": { "version": "2.1", "sha256": "<64 hex minúsculos>" }\n  },\n  "payer": { "name": "Maria Souza", "document": "12345678901" }\n}',
            },
          ],
        },
        {
          id: "pix",
          title: "Gerar o PIX",
          blocks: [
            {
              type: "p",
              text: "`POST /v1/partner/analyses/{id}/pix` (`analysis:pay`) e `POST /v1/partner/registry-requests/{id}/pix` (`registry:pay`) criam ou recuperam o PIX. `payer` (nome e CPF/CNPJ) é opcional: se o perfil cifrado já existir com os mesmos dados, ele é reutilizado, e uma identidade diferente não o substitui em silêncio.",
            },
            {
              type: "p",
              text: "A resposta traz `intent_id`, `amount_cents`, `due_date`, `pix_payload` (copia e cola), `qr_image_base64` e `qr_expires_at`. Para acompanhar, use `GET` na mesma rota, com `payment:read`, ou o webhook `payment.confirmed`.",
            },
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'curl --request POST "$API_URL/v1/partner/registry-requests/$OPERATION_ID/pix" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Content-Type: application/json" \\\n  --data @pagamento.json',
            },
          ],
        },
        {
          id: "creditos",
          title: "Usar créditos",
          blocks: [
            {
              type: "p",
              text: "`POST /v1/partner/analyses/{id}/credits` e `POST /v1/partner/registry-requests/{id}/credits` exigem `payment:credits`. O corpo é só a confirmação jurídica, sem `payer` e sem valor. A repetição idêntica devolve o mesmo débito; no pedido registral o débito também despacha o pedido.",
            },
            {
              type: "code",
              language: "shell",
              label: "cURL",
              code: 'curl --request POST "$API_URL/v1/partner/analyses/$ANALYSIS_ID/credits" \\\n  --header "Authorization: Bearer $ACCESS_TOKEN" \\\n  --header "Content-Type: application/json" \\\n  --data @confirmacao-juridica.json',
            },
          ],
        },
      ],
    },
    {
      id: "webhooks",
      group: "eventos",
      title: "Webhooks",
      summary: "Configure o destino HTTPS e os eventos da integração.",
      audience: ["Proprietário", "Desenvolvedor"],
      sections: [
        {
          id: "configurar",
          title: "Configurar o destino",
          blocks: [
            {
              type: "p",
              text: "Na aba Webhooks, o proprietário ou desenvolvedor cadastra o endpoint HTTPS, escolhe entre os eventos reais de análise, registro, pagamento, aquisição, certidão, conexão, credencial e comissão, prepara a rotação da chave, testa a assinatura e ativa, suspende ou remove o destino conforme o fluxo exibido no painel.",
            },
            {
              type: "callout",
              tone: "tip",
              text: "Antes de ativar eventos reais, valide o seu receptor com o vetor de teste da seção de assinatura e com o botão de teste do painel.",
            },
          ],
        },
        {
          id: "o-que-chega",
          title: "O que o seu servidor recebe",
          blocks: [
            {
              type: "p",
              text: "Cada evento chega como um `POST` com corpo JSON no formato v1 e quatro cabeçalhos próprios. O receptor deve responder 2xx.",
            },
            {
              type: "code",
              language: "http",
              label: "Requisição",
              code: "POST /seu/endpoint HTTP/1.1\nContent-Type: application/json\nX-Aferis-Event-Id: <id do evento>\nX-Aferis-Timestamp: <carimbo de tempo>\nX-Aferis-Key-Version: <versão da chave>\nX-Aferis-Signature: sha256=<hmac em hexadecimal>",
            },
            {
              type: "code",
              language: "json",
              label: "Corpo (JSON)",
              code: '{\n  "application_id": "0192a8c0-0000-7000-8000-000000000002",\n  "connection_id": "0192a8c0-2222-7000-8000-000000000004",\n  "data": {\n    "analysis_request_id": "019a0000-0000-7000-8000-000000000004"\n  },\n  "event": "analysis.created",\n  "id": "0192a8c0-0000-7000-8000-000000000001",\n  "occurred_at": "2026-10-23T12:00:00.123456Z",\n  "version": 1\n}',
            },
            {
              type: "p",
              text: "O catálogo completo, com o exemplo assinado e os campos de cada evento, está em **Eventos e payloads**, na aba Webhooks da aplicação.",
            },
          ],
        },
        {
          id: "escopos-de-evento",
          title: "Escopos de evento",
          blocks: [
            {
              type: "p",
              text: "Um evento só é enviado se a aplicação tiver o escopo da sua família. O evento `webhook.test` é fictício e não pode ser selecionado.",
            },
            {
              type: "table",
              caption: "Escopo de cada família de eventos",
              columns: ["Família", "Escopo", "Eventos"],
              rows: [
                [
                  "Análises",
                  "`events:analysis`",
                  "`analysis.created`, `analysis.completed`, `analysis.failed`, `analysis.review_required`",
                ],
                [
                  "Registro de imóveis",
                  "`events:registry`",
                  "`registry.created`, `registry.preview.completed`, `registry.quote.created`, `registry.quote.expired`",
                ],
                [
                  "Pagamentos",
                  "`events:payment`",
                  "`payment.created`, `payment.confirmed`, `payment.failed`, `payment.refunded`",
                ],
                [
                  "Aquisições",
                  "`events:acquisition`",
                  "`acquisition.submitted`, `acquisition.completed`, `acquisition.failed`",
                ],
                [
                  "Certidões",
                  "`events:certificate`",
                  "`certificate.available`",
                ],
                [
                  "Conexões",
                  "`events:connection`",
                  "`connection.created`, `connection.revoked`",
                ],
                [
                  "Credenciais",
                  "`events:credential`",
                  "`credential.created`, `credential.revoked`",
                ],
                [
                  "Comissões",
                  "`events:commission`",
                  "`commission.owed`, `commission.reverted`",
                ],
              ],
            },
          ],
        },
        {
          id: "validar-assinatura",
          title: "Validar a assinatura",
          blocks: [
            {
              type: "steps",
              items: [
                {
                  title: "Monte o texto assinado",
                  text: "Junte o cabeçalho `X-Aferis-Timestamp`, um ponto e os bytes exatos recebidos. Não reserialize o JSON.",
                },
                {
                  title: "Calcule o HMAC",
                  text: "Aplique HMAC-SHA256 com a sua chave e escreva o resultado em hexadecimal, com o prefixo `sha256=`.",
                },
                {
                  title: "Compare em tempo constante",
                  text: "Compare com `X-Aferis-Signature`. Durante uma rotação de chave, `X-Aferis-Key-Version` indica qual chave assinou.",
                },
              ],
            },
            { type: "samples", id: "verify-webhook" },
            {
              type: "callout",
              tone: "tip",
              text: "Rejeite o evento se o carimbo estiver muito distante da hora atual (por exemplo, mais de 5 minutos) para barrar repetições antigas.",
            },
          ],
        },
      ],
    },
    {
      id: "entregas",
      group: "eventos",
      title: "Entregas de eventos",
      summary: "Acompanhe cada tentativa de entrega do webhook.",
      audience: ["Proprietário", "Desenvolvedor"],
      sections: [
        {
          id: "acompanhar",
          title: "Acompanhar as entregas",
          blocks: [
            {
              type: "p",
              text: "Entregas lista eventos enviados, estado, status HTTP, duração, endpoint e horário. Os eventos de saída incluem `analysis.created/completed/failed/review_required`, `registry.created/preview.completed/quote.created/quote.expired`, `payment.created/confirmed/failed/refunded`, `acquisition.submitted/completed/failed`, `certificate.available`, `connection.created/revoked`, `credential.created/revoked` e `commission.owed/reverted`. Deduplique por `id` do evento e reconcilie pelo GET da operação quando houver estado local incerto.",
            },
          ],
        },
        {
          id: "receber-com-seguranca",
          title: "Receber com segurança",
          blocks: [
            {
              type: "list",
              items: [
                "Responda 2xx assim que o evento for aceito.",
                "Deduplique pelo campo `id` do evento: a mesma entrega pode chegar mais de uma vez.",
                "Trate retries de forma idempotente.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "metricas",
      group: "painel",
      title: "Métricas",
      summary: "Consulte volume, sucesso, latência e conexões.",
      audience: ["Proprietário", "Desenvolvedor", "Financeiro (leitura)"],
      sections: [
        {
          id: "indicadores",
          title: "Indicadores disponíveis",
          blocks: [
            {
              type: "p",
              text: "Em Métricas, selecione a aplicação e o período para acompanhar análises enviadas e concluídas, pedidos registrais, conexões ativas, tentativas, entregas, latência mediana e p95, além dos indicadores comerciais exibidos para a organização.",
            },
          ],
        },
      ],
    },
    {
      id: "extrato",
      group: "painel",
      title: "Extrato e repasses",
      summary: "Consulte lançamentos e estados financeiros permitidos.",
      audience: ["Proprietário", "Financeiro (leitura)"],
      sections: [
        {
          id: "lancamentos",
          title: "Lançamentos e repasses",
          blocks: [
            {
              type: "p",
              text: "Em Extrato, o proprietário e o financeiro em leitura consultam itens, origem, estado do repasse e valor. O papel financeiro não concede leitura jurídica, gestão de pessoas, credenciais ou webhooks.",
            },
          ],
        },
      ],
    },
    {
      id: "pessoas",
      group: "painel",
      title: "Pessoas e papéis",
      summary: "Convide pessoas e mantenha o acesso da organização.",
      audience: ["Proprietário"],
      sections: [
        {
          id: "convites",
          title: "Convites e papéis",
          blocks: [
            {
              type: "p",
              text: "Somente o proprietário administra pessoas: envia convites, acompanha o estado, altera papéis e consulta o histórico. Os papéis são proprietário, desenvolvedor e financeiro (leitura); o último proprietário ativo não pode ser removido ou rebaixado sem proteção do sistema.",
            },
          ],
        },
      ],
    },
    {
      id: "permissoes",
      group: "painel",
      title: "Matriz de acesso",
      summary: "Confira quais áreas cada papel pode abrir.",
      sections: [
        {
          id: "por-papel",
          title: "Áreas por papel",
          blocks: [
            {
              type: "table",
              caption: "Áreas do painel que cada papel abre",
              columns: [
                "Área",
                "Proprietário",
                "Desenvolvedor",
                "Financeiro (leitura)",
              ],
              rows: [
                ["Integrações", "Sim", "Sim", "—"],
                ["Métricas", "Sim", "Sim", "Sim"],
                ["Extrato", "Sim", "—", "Sim"],
                ["Pessoas", "Sim", "—", "—"],
                ["Documentação", "Sim", "Sim", "Sim"],
              ],
            },
            {
              type: "p",
              text: "O desenvolvedor opera credenciais, webhooks e entregas dentro da aplicação.",
            },
            {
              type: "callout",
              tone: "note",
              text: "A API continua sendo a autoridade e pode responder 403 quando o papel não permitir a operação.",
            },
          ],
        },
      ],
    },
    {
      id: "seguranca",
      group: "referencia",
      title: "Erros e segurança",
      summary: "Trate falhas sem duplicar efeitos externos.",
      sections: [
        {
          id: "codigos",
          title: "O que fazer em cada erro",
          blocks: [
            {
              type: "table",
              caption: "Status HTTP e a ação recomendada",
              columns: ["Status", "O que fazer"],
              rows: [
                ["401", "Renove o token."],
                ["403", "Confira origem, papel, escopo e consentimento."],
                ["409", "Leia o estado atual."],
                ["422", "Corrija os dados."],
                ["429", "Respeite o cabeçalho `Retry-After`."],
                [
                  "503",
                  "Informe indisponibilidade sem afirmar queda de fornecedor.",
                ],
              ],
            },
          ],
        },
        {
          id: "problem-details",
          title: "Formato dos erros",
          blocks: [
            {
              type: "p",
              text: "Fora do endpoint de token, os erros usam Problem Details (`application/problem+json`). Ao pedir ajuda, informe o `request_id`.",
            },
            {
              type: "table",
              caption: "Campos de um erro",
              columns: ["Campo", "Conteúdo"],
              rows: [
                [
                  "`type`, `title`",
                  "Identificam o tipo do problema e o resumem.",
                ],
                ["`status`", "O status HTTP."],
                ["`detail`", "A explicação do erro."],
                ["`instance`", "Identifica esta ocorrência."],
                ["`code`", "Código do erro."],
                [
                  "`request_id`",
                  "Identificador da requisição, para o suporte.",
                ],
                ["`retryable`", "Indica se repetir a chamada pode funcionar."],
                ["`errors`", "Lista de problemas por campo, quando houver."],
              ],
            },
          ],
        },
        {
          id: "nunca-registre",
          title: "O que nunca registrar",
          blocks: [
            {
              type: "callout",
              tone: "danger",
              title: "Dados que não vão para log",
              text: "Nunca registre `client_secret`, token, `code_verifier` ou `code`.",
            },
          ],
        },
      ],
    },
  ],
};
