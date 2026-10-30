import { useMemo, useState } from "react";

type DocTopic = {
  id: string;
  label: string;
  summary: string;
  body: string;
  code?: string;
};

const TOPICS: DocTopic[] = [
  {
    id: "primeiros-passos",
    label: "Primeiros passos",
    summary: "O caminho mínimo para colocar a integração em funcionamento.",
    body: "A Aferis cadastra a organização, a aplicação, os redirects, as permissões e o usuário do painel. O parceiro guarda as credenciais no backend, configura o webhook e inicia o fluxo OAuth quando precisar operar em nome de um titular.",
  },
  {
    id: "oauth",
    label: "OAuth e PKCE",
    summary: "Autentique o titular sem expor segredos no navegador.",
    body: "Gere state, code_verifier e code_challenge no backend. Redirecione o navegador para a Aferis. Depois da aprovação, confira o state e troque o code por um token delegado somente no servidor.",
    code: `API_URL="https://api.aferis.ai"
curl --get "$API_URL/oauth/authorize" \\
  --data-urlencode "response_type=code" \\
  --data-urlencode "client_id=$CLIENT_ID" \\
  --data-urlencode "redirect_uri=$REDIRECT_URI" \\
  --data-urlencode "scope=analysis:read analysis:submit:upload" \\
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
    id: "ordens",
    label: "Criar e acompanhar ordens",
    summary: "Crie uma solicitação e acompanhe pelo ID retornado.",
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
    id: "webhooks",
    label: "Webhooks",
    summary: "Receba eventos e reconcilie estados com segurança.",
    body: "Cadastre o endpoint HTTPS no painel, escolha os eventos e faça o teste assinado. No recebimento, valide assinatura, event_id e timestamp; use GET para reconciliar quando o estado local estiver incerto.",
  },
  {
    id: "permissoes",
    label: "Permissões e papéis",
    summary: "Entenda o que cada pessoa e aplicação pode fazer.",
    body: "Owner gerencia pessoas e integrações. Developer gerencia credenciais e webhooks e vê métricas. Financial reader vê extrato e métricas. Escopos da aplicação e consentimento do titular são gates independentes do papel humano.",
  },
  {
    id: "erros",
    label: "Erros e segurança",
    summary: "Como tratar respostas sem duplicar efeitos externos.",
    body: "401: renove o token. 403: confira origem, escopo e consentimento. 409: leia o estado atual. 422: corrija os dados. 429: respeite Retry-After. 503: informe indisponibilidade sem afirmar queda de fornecedor. Nunca registre client_secret, token, code_verifier ou code.",
  },
];

/** Render partner documentation inside the authenticated corporate portal. */
export function PartnerDocumentation() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(TOPICS[0].id);
  const [copied, setCopied] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return term
      ? TOPICS.filter((topic) => `${topic.label} ${topic.summary} ${topic.body}`.toLocaleLowerCase("pt-BR").includes(term))
      : TOPICS;
  }, [query]);
  const active = filtered.find((topic) => topic.id === activeId) ?? filtered[0] ?? TOPICS[0];

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
          <p className="pp-docs-lead">Um guia direto para autenticar, criar ordens, receber eventos e operar sua integração AferisAI.</p>
        </div>
        <label className="pp-docs-search">
          <span>Buscar na documentação</span>
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="OAuth, webhook, ordem…" />
        </label>
      </header>
      <div className="pp-docs-layout">
        <nav className="pp-docs-nav" aria-label="Tópicos da documentação">
          {filtered.map((topic) => <button key={topic.id} type="button" className={active.id === topic.id ? "active" : ""} onClick={() => setActiveId(topic.id)}>{topic.label}<small>{topic.summary}</small></button>)}
          {filtered.length === 0 && <p className="form-hint">Nenhum tópico encontrado.</p>}
        </nav>
        <article className="pp-docs-article">
          <p className="pp-docs-eyebrow">Guia de operação</p>
          <h2>{active.label}</h2>
          <p className="pp-docs-summary">{active.summary}</p>
          <p className="pp-docs-body">{active.body}</p>
          {active.code && <div className="pp-docs-code-wrap"><div className="pp-docs-code-head"><span>cURL</span><button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy(active.code!)}>{copied === active.id ? "Copiado" : "Copiar código"}</button></div><pre><code>{active.code}</code></pre></div>}
        </article>
      </div>
      <footer className="pp-docs-footer">Precisa de ajuda com credenciais, permissões ou retorno OAuth? Fale com o administrador da sua organização.</footer>
    </section>
  );
}
