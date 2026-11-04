import { useMemo, useState } from "react";

type DocTopic = {
  id: string;
  label: string;
  summary: string;
  body: string;
  code?: string;
};

const QUICKSTART = [
  {
    number: "01",
    title: "Confira os acessos",
    body: "Valide os escopos concedidos antes de iniciar o fluxo.",
    action: "Abrir Acessos",
  },
  {
    number: "02",
    title: "Conecte com OAuth",
    body: "Use state, PKCE e troque o code somente no backend.",
    action: "Ler OAuth + PKCE",
  },
  {
    number: "03",
    title: "Ligue os webhooks",
    body: "Cadastre um endpoint HTTPS, escolha eventos e valide a assinatura.",
    action: "Ler Webhooks",
  },
  {
    number: "04",
    title: "Monitore entregas",
    body: "Responda 2xx, deduplique por event_id e investigue retries.",
    action: "Ler Entregas",
  },
] as const;

const TOPICS: DocTopic[] = [
  {
    id: "comece-aqui",
    label: "Comece aqui",
    summary: "Siga a ordem recomendada para colocar a integração em produção.",
    body: "A integração começa no backend do parceiro: confirme os acessos, implemente OAuth + PKCE, configure o receptor HTTPS e valide a assinatura antes de ativar eventos reais. Depois, acompanhe as entregas pelo painel e trate retries de forma idempotente.",
    code: `# Ordem recomendada\n1. Acessos e escopos\n2. OAuth + PKCE\n3. Webhook + assinatura HMAC\n4. Entregas + retries`,
  },
  {
    id: "organizacao-e-sessao",
    label: "Organização e sessão",
    summary: "Troque de empresa e entenda o contexto ativo do painel.",
    body: "O topo do painel mostra a empresa ativa, o usuário conectado e o papel da sessão. Quando uma pessoa participa de mais de uma empresa, o seletor permite trocar a organização; todas as aplicações, métricas, pessoas e extratos são revalidados para a empresa selecionada.",
  },
  {
    id: "aplicacoes",
    label: "Aplicações e visão geral",
    summary: "Consulte o estado e abra cada integração da organização.",
    body: "Em Integrações, o parceiro visualiza as aplicações da organização, seu nome e estado (ativa ou suspensa). Ao abrir uma aplicação, a Visão geral reúne a identidade da integração, atividade recente e os sinais operacionais disponíveis para a sessão.",
  },
  {
    id: "credenciais",
    label: "Credenciais",
    summary: "Emita, consulte e revogue credenciais da aplicação.",
    body: "A aba Credenciais permite ao proprietário ou desenvolvedor administrar credenciais da aplicação, conferir estado, validade e escopos e revogar uma chave. O segredo é apresentado somente no momento permitido; armazene-o no backend e nunca no navegador, repositório ou log.",
  },
  {
    id: "oauth",
    label: "OAuth e PKCE",
    summary: "Use a aplicação para autenticar o titular com segurança.",
    body: "O painel fornece o contexto da integração; o fluxo OAuth acontece no produto do parceiro. Gere state, code_verifier e code_challenge no backend. Use scope=all para solicitar todos os escopos delegáveis da credencial; o servidor expande a lista e o titular ainda precisa aprovar. Redirecione o navegador para a Aferis, confira o state no retorno e troque o code por um token delegado somente no servidor.",
    code: `API_URL="https://api.aferis.ai"
curl --get "$API_URL/oauth/authorize" \\
  --data-urlencode "response_type=code" \\
  --data-urlencode "client_id=$CLIENT_ID" \\
  --data-urlencode "redirect_uri=$REDIRECT_URI" \\
  --data-urlencode "scope=all" \\
  --data-urlencode "state=$STATE" \\
  --data-urlencode "code_challenge=$CHALLENGE" \\
  --data-urlencode "code_challenge_method=S256"

curl --request POST "$API_URL/oauth/token" \\
  --user "$CLIENT_ID:$CLIENT_SECRET" \\
  --data-urlencode "grant_type=authorization_code" \\
  --data-urlencode "code=$CODE" \\
  --data-urlencode "redirect_uri=$REDIRECT_URI" \\
  --data-urlencode "code_verifier=$VERIFIER"`,
  },
  {
    id: "acessos",
    label: "Acessos e escopos",
    summary: "Veja as permissões concedidas à aplicação.",
    body: "A aba Acessos mostra a matriz de escopos, a descrição de cada permissão e a quantidade concedida. No painel parceiro a consulta é somente leitura: a equipe Aferis concede ou revoga escopos, e o servidor revalida papel, organização, aplicação e consentimento em cada operação.",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    summary: "Configure o destino HTTPS e os eventos da integração.",
    body: "Na aba Webhooks, o proprietário ou desenvolvedor cadastra o endpoint HTTPS, escolhe os eventos disponíveis, prepara a rotação da chave, testa a assinatura e ativa, suspende ou remove o destino conforme o fluxo exibido no painel.",
  },
  {
    id: "entregas",
    label: "Entregas de eventos",
    summary: "Acompanhe cada tentativa de entrega do webhook.",
    body: "Entregas lista eventos enviados, estado, status HTTP, duração, endpoint e horário. Use os filtros por estado e tipo, abra o detalhe para investigar a resposta e reconcilie pelo GET da operação quando houver estado local incerto. Reenvie somente quando a ação estiver autorizada e auditada.",
  },
  {
    id: "ordens",
    label: "Operação pela API",
    summary: "Crie e acompanhe pedidos autorizados pelo produto do parceiro.",
    body: "O POST cria a intenção. Use UUIDv7 novo na idempotência, guarde o operation_id e acompanhe por GET ou webhook. Timeout, 502 e resposta incompleta não autorizam repetir o POST externo.",
    code: `curl --request POST "$API_URL/v1/partner/registry-requests/number" \\
  --header "Authorization: Bearer $ACCESS_TOKEN" \\
  --header "Idempotency-Key: $UUIDV7" \\
  --header "Content-Type: application/json" \\
  --data '{
    "product": "visualizacao",
    "office_id": "<OFFICE_UUIDV7>",
    "registration_numbers": ["12345"]
  }'

curl "$API_URL/v1/partner/registry-requests/<OPERATION_ID>" \\
  --header "Authorization: Bearer $ACCESS_TOKEN"`,
  },
  {
    id: "metricas",
    label: "Métricas",
    summary: "Consulte volume, sucesso, latência e conexões.",
    body: "Em Métricas, selecione a aplicação e o período para acompanhar análises enviadas e concluídas, pedidos registrais, conexões ativas, tentativas, entregas, latência mediana e p95, além dos indicadores comerciais exibidos para a organização.",
  },
  {
    id: "extrato",
    label: "Extrato e repasses",
    summary: "Consulte lançamentos e estados financeiros permitidos.",
    body: "Em Extrato, o proprietário e o financeiro em leitura consultam itens, origem, estado do repasse e valor. O papel financeiro não concede leitura jurídica, gestão de pessoas, credenciais ou webhooks.",
  },
  {
    id: "pessoas",
    label: "Pessoas e papéis",
    summary: "Convide pessoas e mantenha o acesso da organização.",
    body: "Somente o proprietário administra pessoas: envia convites, acompanha o estado, altera papéis e consulta o histórico. Os papéis são proprietário, desenvolvedor e financeiro (leitura); o último proprietário ativo não pode ser removido ou rebaixado sem proteção do sistema.",
  },
  {
    id: "permissoes",
    label: "Matriz de acesso",
    summary: "Confira quais áreas cada papel pode abrir.",
    body: "Proprietário: integrações, métricas, extrato, pessoas e documentação. Desenvolvedor: integrações, métricas e documentação; opera credenciais, webhooks e entregas dentro da aplicação. Financeiro (leitura): métricas, extrato e documentação. A API continua sendo a autoridade e pode responder 403 quando o papel não permitir a operação.",
  },
  {
    id: "seguranca",
    label: "Erros e segurança",
    summary: "Trate falhas sem duplicar efeitos externos.",
    body: "401: renove o token. 403: confira origem, papel, escopo e consentimento. 409: leia o estado atual. 422: corrija os dados. 429: respeite Retry-After. 503: informe indisponibilidade sem afirmar queda de fornecedor. Nunca registre client_secret, token, code_verifier ou code.",
  },
];

/** Render partner documentation inside the authenticated corporate portal. */
export function PartnerDocumentation() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("comece-aqui");
  const [copied, setCopied] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return term
      ? TOPICS.filter((topic) =>
          `${topic.label} ${topic.summary} ${topic.body}`
            .toLocaleLowerCase("pt-BR")
            .includes(term),
        )
      : TOPICS;
  }, [query]);
  const active =
    filtered.find((topic) => topic.id === activeId) ?? filtered[0] ?? TOPICS[0];

  async function copy(code: string) {
    await navigator.clipboard?.writeText(code);
    setCopied(active.id);
    window.setTimeout(() => setCopied(""), 1600);
  }

  return (
    <section className="pp-docs" aria-label="Documentação da integração">
      <header className="pp-docs-head">
        <div>
          <p className="pp-kicker">Central do parceiro</p>
          <h1 className="pp-docs-title">Documentação da integração</h1>
          <p className="pp-docs-lead">
            Um guia direto para autenticar, criar ordens, receber eventos e
            operar sua integração AferisAI.
          </p>
        </div>
        <label className="pp-docs-search">
          <span>Buscar na documentação</span>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="OAuth, webhook, ordem…"
          />
        </label>
      </header>
      <section
        className="pp-docs-quickstart"
        aria-labelledby="pp-docs-quickstart-title"
      >
        <div className="pp-docs-quickstart-intro">
          <p className="pp-docs-eyebrow">Rota recomendada</p>
          <h2 id="pp-docs-quickstart-title">
            Da primeira autorização ao primeiro evento
          </h2>
          <p>
            Use esta sequência para reduzir erros de configuração e validar o
            receptor antes de ativar a operação.
          </p>
        </div>
        <ol className="pp-docs-steps">
          {QUICKSTART.map((step, index) => (
            <li key={step.number}>
              <span className="pp-docs-step-number" aria-hidden="true">
                {step.number}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setQuery("");
                    setActiveId(
                      ["acessos", "oauth", "webhooks", "entregas"][index] ??
                        "comece-aqui",
                    );
                  }}
                >
                  {step.action}
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className="pp-docs-layout">
        <nav className="pp-docs-nav" aria-label="Tópicos da documentação">
          {filtered.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={active.id === topic.id ? "active" : ""}
              onClick={() => setActiveId(topic.id)}
            >
              {topic.label}
              <small>{topic.summary}</small>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="form-hint">Nenhum tópico encontrado.</p>
          )}
        </nav>
        <article className="pp-docs-article">
          <p className="pp-docs-eyebrow">Guia de operação</p>
          <h2>{active.label}</h2>
          <p className="pp-docs-summary">{active.summary}</p>
          <p className="pp-docs-body">{active.body}</p>
          {active.code && (
            <div className="pp-docs-code-wrap">
              <div className="pp-docs-code-head">
                <span>cURL</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void copy(active.code!)}
                >
                  {copied === active.id ? "Copiado" : "Copiar código"}
                </button>
              </div>
              <pre>
                <code>{active.code}</code>
              </pre>
            </div>
          )}
        </article>
      </div>
      <footer className="pp-docs-footer">
        Precisa de ajuda com credenciais, permissões ou retorno OAuth? Fale com
        o administrador da sua organização.
      </footer>
    </section>
  );
}
