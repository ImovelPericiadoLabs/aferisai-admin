import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useToast, type Toast, type ToastKind } from "./useToast";
import {
  ApiError,
  beginPasskeyLogin,
  createOrganization,
  createSession,
  currentMember,
  deleteSession,
  finishPasskeyLogin,
  listOrganizations,
  renewCsrf,
  type OnboardingResult,
  type OrganizationListItem,
  type TeamMember,
} from "./api";
import { OrganizationDetail } from "./OrganizationDetail";
import { Analyses } from "./Analyses";
import { SourceClassification } from "./SourceClassification";
import { FinancialExceptions } from "./FinancialExceptions";
import { RequestDirectory } from "./RequestDirectory";
import { CommercialPolicies } from "./CommercialPolicies";
import { Promotions } from "./Promotions";
import { Commissions } from "./Commissions";
import { RegistryReconciliation } from "./RegistryReconciliation";
import { OnrPreviewReview } from "./OnrPreviewReview";
import { RegistryRequestDirectory } from "./RegistryRequestDirectory";
import { Connections } from "./Connections";
import { Users } from "./Users";
import { TeamMembers } from "./TeamMembers";
import { AnalysisProviders } from "./AnalysisProviders";
import { Passkeys } from "./Passkeys";
import { ShellIcon } from "./ShellIcon";
import { DashboardOverview, DashboardReports } from "./DashboardOverview";
import { teamRoleLabel } from "./display-labels";
import { PartnerPortal } from "./PartnerPortal";
import "./App.css";
import "./brand.css";
import "./directory.css";
import "./operational-polish.css";
import "./shell.css";

type Page =
  | "overview"
  | "reports"
  | "organizations"
  | "commercial"
  | "promotions"
  | "requests"
  | "sources"
  | "analyses"
  | "financial"
  | "commissions"
  | "access"
  | "reconciliation"
  | "onr-review"
  | "registry-requests"
  | "connections"
  | "users"
  | "team-members"
  | "analysis-providers"
  | "passkeys";
type Session = { csrf: string; member: TeamMember };

const nav: { page: Page; label: string; detail: string }[] = [
  { page: "overview", label: "Visão geral", detail: "Início" },
  { page: "reports", label: "Relatórios", detail: "Indicadores disponíveis" },
  { page: "organizations", label: "Parceiros", detail: "Parcerias ativas" },
  {
    page: "commercial",
    label: "Regras comerciais",
    detail: "Regras e versões",
  },
  { page: "promotions", label: "Promoções", detail: "Cupons e links" },
  { page: "requests", label: "Pedidos", detail: "Triagem operacional" },
  { page: "sources", label: "Fontes", detail: "Antes da cobrança" },
  { page: "analyses", label: "Análises", detail: "Conferência interna" },
  { page: "financial", label: "Exceções", detail: "Decisão financeira" },
  { page: "commissions", label: "Repasses", detail: "Comissões e pagamentos" },
  { page: "connections", label: "Conexões", detail: "Consentimentos ativos" },
  { page: "users", label: "Usuários", detail: "Contas da plataforma" },
  { page: "team-members", label: "Equipe", detail: "Membros internos" },
  {
    page: "analysis-providers",
    label: "Provedores IA",
    detail: "Contas e limites",
  },
  { page: "passkeys", label: "Minhas chaves", detail: "Acesso à conta" },
  { page: "access", label: "Permissões", detail: "Estrutura de acesso" },
  {
    page: "reconciliation",
    label: "Conciliação",
    detail: "Submissões incertas",
  },
  { page: "onr-review", label: "Prévia ONR", detail: "Revisão de prévia" },
  {
    page: "registry-requests",
    label: "Pedidos registrais",
    detail: "Todos os pedidos",
  },
];

const navGroups: { title: string; pages: Page[] }[] = [
  { title: "Painel", pages: ["overview", "reports"] },
  {
    title: "Operação",
    pages: [
      "requests",
      "registry-requests",
      "sources",
      "analyses",
      "reconciliation",
      "onr-review",
    ],
  },
  {
    title: "Comercial",
    pages: [
      "organizations",
      "connections",
      "users",
      "commercial",
      "promotions",
    ],
  },
  { title: "Financeiro", pages: ["financial", "commissions"] },
];

function message(error: unknown): string {
  if (error instanceof ApiError) return error.detail;
  return "Não foi possível conectar à API. Confira a configuração e tente novamente.";
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loginMode, setLoginMode] = useState<"passkey" | "password">(
    browserSupportsWebAuthn() ? "passkey" : "password",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginMode === "passkey") {
      await submitPasskey();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await createSession({ email, password, otp });
      const member = await currentMember();
      setPassword("");
      setOtp("");
      onLogin({ csrf: result.csrf_token, member });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitPasskey() {
    if (!email.trim()) {
      setError("Informe seu e-mail para entrar com a chave de acesso.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const options = await beginPasskeyLogin(email.trim());
      const credential = await startAuthentication({
        optionsJSON:
          options.public_key as unknown as PublicKeyCredentialRequestOptionsJSON,
      });
      const result = await finishPasskeyLogin(
        email.trim(),
        options.challenge_id,
        credential as unknown as Record<string, unknown>,
      );
      const member = await currentMember();
      onLogin({ csrf: result.csrf_token, member });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? message(cause)
          : "A chave de acesso não foi confirmada pelo dispositivo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand light />
        <div>
          <p className="eyebrow">AferisAI</p>
          <h1>Clareza para cada decisão.</h1>
          <p>
            Acompanhe operações, análises e parcerias em um espaço seguro,
            organizado para a sua equipe.
          </p>
          <svg
            className="login-illustration"
            viewBox="0 0 420 185"
            fill="none"
            role="img"
            aria-label="Fluxo de documentos, análise e decisão"
          >
            <path
              d="M24 96h368"
              stroke="#6F95CE"
              strokeWidth="2"
              strokeDasharray="5 8"
            />
            <rect
              x="24"
              y="49"
              width="94"
              height="94"
              rx="17"
              fill="#12325B"
              stroke="#557BAE"
            />
            <path
              d="M55 73h32M55 87h32M55 101h23"
              stroke="#A6C4F2"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <rect
              x="163"
              y="35"
              width="94"
              height="122"
              rx="17"
              fill="#12325B"
              stroke="#557BAE"
            />
            <path
              d="m191 98 16 16 26-32"
              stroke="#79ACFF"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="302"
              y="49"
              width="94"
              height="94"
              rx="17"
              fill="#075BFF"
              stroke="#81AFFF"
            />
            <path
              d="M329 83h40M329 97h40M329 111h25"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <small>AferisAI · Operação e governança</small>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <p className="eyebrow">Acesso da equipe</p>
          <h1 id="login-title">Entrar na área da equipe</h1>
          <p className="muted">
            {loginMode === "passkey"
              ? "Informe seu e-mail e confirme a chave de acesso no dispositivo."
              : "Use sua senha e o código atual do aplicativo autenticador."}
          </p>
          <form onSubmit={submit} className="form">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {loginMode === "password" && (
              <>
                <label htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <label htmlFor="otp">Código do autenticador</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  required
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ""))
                  }
                />
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Verificando…"
                : loginMode === "passkey"
                  ? "Entrar com chave de acesso"
                  : "Entrar com senha e código"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          {(loginMode === "passkey" || browserSupportsWebAuthn()) && (
            <div className="passkey-login-option">
              <p>
                {loginMode === "passkey"
                  ? "Ainda não cadastrou uma chave?"
                  : "Já tem uma chave de acesso?"}
              </p>
              <button
                type="button"
                className="button secondary full"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setLoginMode(
                    loginMode === "passkey" ? "password" : "passkey",
                  );
                }}
              >
                {loginMode === "passkey"
                  ? "Usar senha e código"
                  : "Usar chave de acesso"}{" "}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}
          <p className="fine-print">
            {loginMode === "passkey"
              ? "A chave privada permanece no seu dispositivo ou gerenciador de senhas."
              : "Sua senha e o código do autenticador não são salvos neste navegador."}
          </p>
          <a className="partner-team-link" href="/#parceiro">
            Sou parceiro · acessar minha integração
          </a>
        </div>
        <svg
          className="login-mobile-art"
          viewBox="0 0 240 48"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 24h240"
            stroke="#DCE8F7"
            strokeWidth="2"
            strokeDasharray="4 7"
          />
          <rect
            x="20"
            y="9"
            width="31"
            height="31"
            rx="9"
            fill="#EDF4FF"
            stroke="#C7DAF6"
          />
          <path
            d="M29 19h13M29 25h9"
            stroke="#075BFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="120" cy="24" r="18" fill="#E7F0FF" stroke="#B9D1F7" />
          <path
            d="m111 24 6 6 12-13"
            stroke="#075BFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="189"
            y="9"
            width="31"
            height="31"
            rx="9"
            fill="#EDF4FF"
            stroke="#C7DAF6"
          />
          <path
            d="M198 19h13M198 25h9"
            stroke="#075BFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </section>
    </main>
  );
}

function Brand({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <img
        src={
          compact ? "/icon.svg" : light ? "/logo-light.svg" : "/logo-dark.svg"
        }
        alt="AferisAI"
      />
      {!compact && <span>Equipe</span>}
    </div>
  );
}

function OrganizationDirectory({
  unauthorize,
  onSelect,
}: {
  unauthorize: () => void;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let live = true;
    listOrganizations(query, cursor)
      .then((result) => {
        if (!live) return;
        setItems((current) =>
          cursor ? [...current, ...result.items] : result.items,
        );
        setNextCursor(result.next_cursor);
      })
      .catch((cause) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) unauthorize();
        else setError(message(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [query, cursor, revision, unauthorize]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setCursor(undefined);
    setQuery(search);
    setRevision((value) => value + 1);
  }

  return (
    <section className="directory" aria-labelledby="directory-title">
      <div className="directory-head">
        <div>
          <p className="eyebrow">Diretório</p>
          <h2 id="directory-title">Organizações cadastradas</h2>
        </div>
        <form onSubmit={submitSearch} role="search">
          <label htmlFor="org-search">Buscar organização</label>
          <div>
            <input
              id="org-search"
              maxLength={100}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome ou identificador"
            />
            <button className="button secondary" type="submit">
              Buscar
            </button>
          </div>
        </form>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && items.length === 0 ? (
        <div
          className="skeleton-rows"
          role="status"
          aria-label="Carregando organizações"
        >
          {[0.7, 0.85, 0.6, 0.75, 0.65].map((w, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: "1rem", alignItems: "center" }}
            >
              <div
                className="skeleton"
                style={{ height: "1rem", width: `${w * 100}%` }}
              />
              <div
                className="skeleton"
                style={{ height: "1rem", width: "6rem", flexShrink: 0 }}
              />
            </div>
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <p className="directory-state">Nenhuma organização encontrada.</p>
      ) : (
        <div className="directory-table" role="table" aria-label="Organizações">
          <div className="directory-row directory-labels" role="row">
            <span role="columnheader">Organização</span>
            <span role="columnheader">Identificador</span>
            <span role="columnheader">Estado</span>
          </div>
          {items.map((item) => (
            <div className="directory-row" role="row" key={item.id}>
              <span role="cell">
                <button
                  className="directory-name"
                  onClick={() => onSelect(item.id)}
                  aria-label={`Abrir ${item.name}`}
                >
                  <strong>{item.name}</strong>
                </button>
                <small>{item.id}</small>
              </span>
              <span role="cell">{item.slug}</span>
              <span role="cell">
                <span
                  className={`badge ${item.status === "active" ? "badge-green" : item.status === "suspended" ? "badge-yellow" : "badge-gray"}`}
                >
                  {item.status === "active"
                    ? "Ativa"
                    : item.status === "suspended"
                      ? "Suspensa"
                      : "Desconhecido"}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      {nextCursor && (
        <button
          className="button secondary load-more"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setError("");
            setCursor(nextCursor);
          }}
        >
          {loading ? "Carregando…" : "Carregar mais"}
        </button>
      )}
    </section>
  );
}

function Organizations({
  csrf,
  canManage,
  isAdmin,
  unauthorize,
}: {
  csrf: string;
  canManage: boolean;
  isAdmin: boolean;
  unauthorize: () => void;
}) {
  const [view, setView] = useState<"directory" | "create">("directory");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [application, setApplication] = useState("");
  const [created, setCreated] = useState<OnboardingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await createOrganization(
        {
          organization_slug: slug,
          organization_name: name,
          application_name: application,
        },
        csrf,
      );
      setCreated(result);
      setSlug("");
      setName("");
      setApplication("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) unauthorize();
      else setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function copySecret() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.client_secret);
      setCopied(true);
    } catch {
      setError(
        "Não foi possível copiar. Selecione o segredo e copie manualmente.",
      );
    }
  }

  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Parcerias</p>
          <h1>Parceiros</h1>
          <p className="muted">
            Consulte as organizações parceiras ou cadastre uma nova.
          </p>
        </div>
        {canManage && view === "directory" && !selectedId && (
          <button className="button primary" onClick={() => setView("create")}>
            Nova organização <span aria-hidden="true">＋</span>
          </button>
        )}
      </header>
      {view === "directory" || !canManage ? (
        selectedId ? (
          <OrganizationDetail
            organizationId={selectedId}
            csrfToken={csrf}
            canManage={canManage}
            isAdmin={isAdmin}
            onBack={() => setSelectedId(null)}
            onUnauthorized={unauthorize}
          />
        ) : (
          <OrganizationDirectory
            unauthorize={unauthorize}
            onSelect={setSelectedId}
          />
        )
      ) : created ? (
        <section className="result" aria-live="polite">
          <p className="eyebrow">Cadastro concluído</p>
          <h2>Credencial criada</h2>
          <p>
            Guarde os dados por um canal seguro. O segredo não pode ser
            consultado novamente pela API.
          </p>
          <dl>
            <div>
              <dt>Organização</dt>
              <dd>{created.organization_id}</dd>
            </div>
            <div>
              <dt>Aplicação</dt>
              <dd>{created.application_id}</dd>
            </div>
            <div>
              <dt>Client ID</dt>
              <dd>{created.client_id}</dd>
            </div>
            <div>
              <dt>Client secret</dt>
              <dd className="secret">{created.client_secret}</dd>
            </div>
          </dl>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="button-row">
            <button className="button primary" onClick={copySecret}>
              {copied ? "Copiado" : "Copiar segredo"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setCreated(null);
                setCopied(false);
                setView("directory");
              }}
            >
              Limpar e voltar à lista
            </button>
          </div>
        </section>
      ) : (
        <div className="workspace">
          <section className="form-panel" aria-labelledby="form-title">
            <button className="back-link" onClick={() => setView("directory")}>
              ← Voltar à lista
            </button>
            <div className="panel-heading">
              <span>01</span>
              <div>
                <h2 id="form-title">Nova organização</h2>
                <p>Dados que identificam a parceria.</p>
              </div>
            </div>
            <form className="form" onSubmit={submit}>
              <label htmlFor="org-name">Nome da organização</label>
              <input
                id="org-name"
                required
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Cartório Central"
              />
              <label htmlFor="org-slug">Identificador</label>
              <input
                id="org-slug"
                required
                minLength={2}
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                placeholder="cartorio-central"
                aria-describedby="slug-help"
              />
              <small id="slug-help">
                Letras minúsculas, números e hífens. Deve ser único.
              </small>
              <hr />
              <div className="panel-heading">
                <span>02</span>
                <div>
                  <h3>Primeira aplicação</h3>
                  <p>Receberá uma credencial e a permissão inicial.</p>
                </div>
              </div>
              <label htmlFor="app-name">Nome da aplicação</label>
              <input
                id="app-name"
                required
                maxLength={255}
                value={application}
                onChange={(event) => setApplication(event.target.value)}
                placeholder="Ex.: Integração principal"
              />
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary" disabled={busy}>
                {busy ? "Cadastrando…" : "Cadastrar parceria"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </section>
          <aside className="side-panel">
            <p className="eyebrow">Antes de confirmar</p>
            <h2>O que será criado</h2>
            <ol className="steps">
              <li>
                <strong>Organização</strong>
                <span>Vínculo principal da parceria.</span>
              </li>
              <li>
                <strong>Aplicação</strong>
                <span>Identidade técnica associada.</span>
              </li>
              <li>
                <strong>Credencial</strong>
                <span>Segredo entregue uma vez.</span>
              </li>
              <li>
                <strong>Permissão inicial</strong>
                <span>Consulta dos próprios dados da aplicação.</span>
              </li>
            </ol>
            <div className="side-note">
              Essa ação não cria conta de usuário e não libera dados pessoais ao
              parceiro.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Access() {
  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Governança</p>
          <h1>Acessos</h1>
          <p className="muted">Estrutura de autoridade da plataforma.</p>
        </div>
        <span className="pill">Desenho atual</span>
      </header>
      <div className="workspace">
        <section className="form-panel">
          <h2>Hierarquia de acesso</h2>
          <p className="muted">
            Uma aplicação usa apenas permissões concedidas no catálogo da sua
            organização.
          </p>
          <div className="hierarchy">
            <div>
              <span>01</span>
              <strong>Equipe interna</strong>
              <small>Operador autenticado e autorizado</small>
            </div>
            <div>
              <span>02</span>
              <strong>Organização</strong>
              <small>Parceria e catálogo de permissões</small>
            </div>
            <div>
              <span>03</span>
              <strong>Aplicação</strong>
              <small>Credencial técnica própria</small>
            </div>
            <div>
              <span>04</span>
              <strong>Permissão</strong>
              <small>Ação concedida e auditada</small>
            </div>
          </div>
        </section>
        <aside className="side-panel">
          <p className="eyebrow">Disponibilidade da API</p>
          <h2>Próxima etapa</h2>
          <p>
            O cadastro concede somente <code>application:read</code>. Gerenciar
            papéis da equipe ou outras permissões exigirá contratos e endpoints
            próprios no backend.
          </p>
          <div className="side-note">
            Uma credencial de parceiro não representa uma pessoa. O acesso a
            dados pessoais exige consentimento explícito por aplicação e ação.
          </div>
        </aside>
      </div>
    </div>
  );
}

function pageFromHash(): Page {
  const value = window.location.hash.slice(1);
  return value === "organizations" ||
    value === "reports" ||
    value === "commercial" ||
    value === "promotions" ||
    value === "requests" ||
    value === "sources" ||
    value === "analyses" ||
    value === "financial" ||
    value === "commissions" ||
    value === "access" ||
    value === "reconciliation" ||
    value === "onr-review" ||
    value === "registry-requests" ||
    value === "connections" ||
    value === "users" ||
    value === "team-members" ||
    value === "analysis-providers" ||
    value === "passkeys"
    ? value
    : "overview";
}

function TeamApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initial = pageFromHash();
      return Object.fromEntries(
        navGroups.map((group) => [
          group.title,
          group.title === "Painel" ||
            group.pages.includes(initial) ||
            (initial === "overview" && group.title === "Operação"),
        ]),
      );
    },
  );
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountActionRef = useRef<HTMLButtonElement>(null);
  const [logoutError, setLogoutError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();
  const unauthorize = useCallback(() => setSession(null), []);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
  }, []);
  const openMenu = useCallback(() => {
    setAccountMenuOpen(false);
    setMenuOpen(true);
  }, []);
  const navigate = useCallback((next: Page) => {
    setPage(next);
    setAccountMenuOpen(false);
    const group = navGroups.find((entry) => entry.pages.includes(next));
    if (group)
      setExpandedGroups((current) => ({ ...current, [group.title]: true }));
    window.location.hash = next === "overview" ? "" : next;
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = pageFromHash();
      setPage(next);
      const group = navGroups.find((entry) => entry.pages.includes(next));
      if (group)
        setExpandedGroups((current) => ({ ...current, [group.title]: true }));
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;
    accountActionRef.current?.focus();
    const closeAccount = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape")
        setAccountMenuOpen(false);
      if (
        event instanceof PointerEvent &&
        !accountMenuRef.current?.contains(event.target as Node)
      )
        setAccountMenuOpen(false);
    };
    document.addEventListener("keydown", closeAccount);
    document.addEventListener("pointerdown", closeAccount);
    return () => {
      document.removeEventListener("keydown", closeAccount);
      document.removeEventListener("pointerdown", closeAccount);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const toggle = menuToggleRef.current;
    menuCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
      if (event.key !== "Tab" || !sidebarRef.current) return;
      const controls = Array.from(
        sidebarRef.current.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ),
      ).filter((control) => control.getClientRects().length > 0);
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      toggle?.focus();
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    let live = true;
    Promise.all([renewCsrf(), currentMember()])
      .then(([result, member]) => {
        if (live) setSession({ csrf: result.csrf_token, member });
      })
      .catch(() => {
        if (live) setSession(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  async function logout() {
    if (!session) return;
    setLogoutError("");
    try {
      await deleteSession(session.csrf);
      setSession(null);
      navigate("overview");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setSession(null);
      else setLogoutError(message(cause));
    }
  }

  if (loading)
    return (
      <main
        className="loading"
        role="status"
        aria-label="Carregando área da equipe"
      >
        <div className="loading-skeleton" aria-hidden="true">
          <span className="skeleton skeleton-logo" />
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-copy" />
        </div>
      </main>
    );
  if (!session) return <Login onLogin={setSession} />;

  const canReview =
    session.member.role === "administrator" ||
    session.member.role === "manager";
  const isFinancial = session.member.role === "financial";
  const visibleNav = nav.filter((item) =>
    isFinancial
      ? item.page === "overview" ||
        item.page === "reports" ||
        item.page === "financial" ||
        item.page === "commissions" ||
        item.page === "passkeys"
      : (item.page !== "financial" || canReview) &&
        item.page !== "commissions" &&
        (item.page !== "requests" || canReview) &&
        (item.page !== "sources" || canReview) &&
        (item.page !== "analyses" || canReview) &&
        (item.page !== "commercial" ||
          session.member.role === "administrator") &&
        (item.page !== "promotions" ||
          session.member.role === "administrator") &&
        (item.page !== "reconciliation" || canReview) &&
        (item.page !== "onr-review" || canReview) &&
        (item.page !== "registry-requests" || canReview) &&
        (item.page !== "connections" || canReview) &&
        (item.page !== "users" || canReview) &&
        (item.page !== "team-members" ||
          session.member.role === "administrator") &&
        (item.page !== "analysis-providers" ||
          session.member.role === "administrator"),
  );
  const currentPage = visibleNav.some((item) => item.page === page)
    ? page
    : isFinancial
      ? "financial"
      : "overview";
  const currentItem = nav.find((item) => item.page === currentPage);
  const mobileItems: Page[] = isFinancial
    ? ["overview", "reports", "financial", "commissions"]
    : canReview
      ? ["overview", "requests", "reports", "financial"]
      : ["overview", "reports"];
  const visibleMobileItems = mobileItems.filter((item) =>
    visibleNav.some((navItem) => navItem.page === item),
  );

  return (
    <div className={`shell${sidebarCollapsed ? " shell-collapsed" : ""}`}>
      <aside
        className={`sidebar ${menuOpen ? "open" : ""}`}
        aria-label="Navegação principal"
        id="team-navigation"
        ref={sidebarRef}
      >
        <div className="sidebar-head">
          <Brand compact={sidebarCollapsed && !menuOpen} />
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={
              sidebarCollapsed ? "Expandir navegação" : "Recolher navegação"
            }
            title={
              sidebarCollapsed ? "Expandir navegação" : "Recolher navegação"
            }
          >
            <ShellIcon
              name={sidebarCollapsed ? "panel-open" : "panel-close"}
              size={17}
            />
          </button>
          <button
            className="close-menu"
            ref={menuCloseRef}
            aria-label="Fechar menu"
            onClick={() => closeMenu()}
          >
            <ShellIcon name="close" />
          </button>
        </div>
        <nav>
          {navGroups.map((group) => {
            const items = group.pages.flatMap((page) =>
              visibleNav.filter((item) => item.page === page),
            );
            if (items.length === 0) return null;
            const isPanel = group.title === "Painel";
            const isOpen = expandedGroups[group.title] ?? false;
            const activeGroup = items.some((item) => item.page === currentPage);
            return (
              <div
                className={`sidebar-nav-group${activeGroup ? " has-active" : ""}`}
                key={group.title}
              >
                {isPanel ? (
                  <p className="nav-title">{group.title}</p>
                ) : (
                  <button
                    className={`nav-group-trigger${activeGroup ? " active" : ""}`}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`nav-group-${group.title}`}
                    title={sidebarCollapsed ? group.title : undefined}
                    onClick={() => {
                      if (sidebarCollapsed && !menuOpen)
                        setSidebarCollapsed(false);
                      setExpandedGroups((current) => ({
                        ...current,
                        [group.title]: !current[group.title],
                      }));
                    }}
                  >
                    <span className="nav-glyph">
                      <ShellIcon
                        name={
                          group.title === "Operação"
                            ? "operations-group"
                            : group.title === "Comercial"
                              ? "commercial-group"
                              : "finance-group"
                        }
                      />
                    </span>
                    <span className="nav-group-label">{group.title}</span>
                    <span
                      className={`nav-group-chevron${isOpen ? " open" : ""}`}
                    >
                      <ShellIcon name="chevron" size={16} />
                    </span>
                  </button>
                )}
                <div
                  className="nav-group-items"
                  id={`nav-group-${group.title}`}
                  hidden={!isPanel && !isOpen}
                >
                  {items.map((item) => (
                    <button
                      key={item.page}
                      className={`nav-link ${currentPage === item.page ? "active" : ""}`}
                      aria-current={
                        currentPage === item.page ? "page" : undefined
                      }
                      title={sidebarCollapsed ? item.label : undefined}
                      onClick={() => {
                        navigate(item.page);
                        closeMenu();
                      }}
                    >
                      <span className="nav-glyph" aria-hidden="true">
                        <ShellIcon name={item.page} />
                      </span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="account-shell" ref={accountMenuRef}>
            {accountMenuOpen && (
              <div className="account-menu" aria-label="Menu da conta">
                <div className="account-menu-heading">
                  <strong>{session.member.email}</strong>
                  <span>{teamRoleLabel(session.member.role)}</span>
                </div>
                <p>Minha conta</p>
                <button
                  ref={accountActionRef}
                  type="button"
                  onClick={() => {
                    navigate("passkeys");
                    closeMenu();
                  }}
                >
                  <ShellIcon name="passkeys" size={17} /> Minhas chaves
                </button>
                {visibleNav.some((item) =>
                  ["team-members", "analysis-providers", "access"].includes(
                    item.page,
                  ),
                ) && <p>Configurações</p>}
                {visibleNav
                  .filter((item) =>
                    ["team-members", "analysis-providers", "access"].includes(
                      item.page,
                    ),
                  )
                  .map((item) => (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => {
                        navigate(item.page);
                        closeMenu();
                      }}
                    >
                      <ShellIcon name={item.page} size={17} /> {item.label}
                    </button>
                  ))}
                <div className="account-menu-divider" />
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="account-signout"
                >
                  <ShellIcon name="logout" size={17} /> Sair da conta
                </button>
              </div>
            )}
            <div className="account-actions">
              <button
                type="button"
                className="account-trigger"
                onClick={() => {
                  if (sidebarCollapsed && !menuOpen) setSidebarCollapsed(false);
                  setAccountMenuOpen((open) => !open);
                }}
                aria-expanded={accountMenuOpen}
                aria-label={`Conta de ${session.member.email}, ${teamRoleLabel(session.member.role)}`}
                title={sidebarCollapsed ? session.member.email : undefined}
              >
                <span className="account-avatar" aria-hidden="true">
                  {session.member.email.slice(0, 2).toUpperCase()}
                </span>
                <span className="account-meta">
                  <strong>{session.member.email}</strong>
                  <small>{teamRoleLabel(session.member.role)}</small>
                  <small className="account-scope">
                    {session.member.role === "administrator"
                      ? "Gestão da plataforma"
                      : session.member.role === "manager"
                        ? "Operação e revisão"
                        : session.member.role === "financial"
                          ? "Pagamentos e repasses"
                          : "Acompanhamento"}
                  </small>
                </span>
                <ShellIcon name="chevron" size={16} />
              </button>
              <button
                type="button"
                className="account-settings"
                aria-label="Abrir configurações"
                aria-expanded={accountMenuOpen}
                title="Configurações"
                onClick={() => {
                  if (sidebarCollapsed && !menuOpen) setSidebarCollapsed(false);
                  setAccountMenuOpen((open) => !open);
                }}
              >
                <ShellIcon name="settings" size={18} />
              </button>
            </div>
          </div>
          {logoutError && (
            <p className="error" role="alert">
              {logoutError}
            </p>
          )}
        </div>
      </aside>
      {menuOpen && (
        <button
          className="backdrop"
          aria-label="Fechar navegação"
          onClick={() => closeMenu()}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            ref={menuToggleRef}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="team-navigation"
            onClick={() => openMenu()}
          >
            <ShellIcon name="menu" />
          </button>
          <div className="topbar-breadcrumb">
            <span>AferisAI</span>
            <ShellIcon name="chevron" size={15} />
            <strong>{currentItem?.label}</strong>
          </div>
          <span className="topbar-label">
            <span className="topbar-status" /> Conectado
          </span>
        </header>
        <main key={currentPage} className="page-fade-in">
          {currentPage === "overview" ? (
            <DashboardOverview role={session.member.role} navigate={navigate} />
          ) : currentPage === "reports" ? (
            <DashboardReports role={session.member.role} navigate={navigate} />
          ) : currentPage === "organizations" ? (
            <Organizations
              csrf={session.csrf}
              canManage={
                session.member.role === "administrator" ||
                session.member.role === "manager"
              }
              isAdmin={session.member.role === "administrator"}
              unauthorize={unauthorize}
            />
          ) : currentPage === "commercial" &&
            session.member.role === "administrator" ? (
            <CommercialPolicies
              csrf={session.csrf}
              onUnauthorized={unauthorize}
            />
          ) : currentPage === "promotions" &&
            session.member.role === "administrator" ? (
            <Promotions csrf={session.csrf} onUnauthorized={unauthorize} />
          ) : currentPage === "requests" ? (
            <RequestDirectory
              canRead={canReview}
              onUnauthorized={unauthorize}
              openSource={(requestId) => {
                setSelectedRequestId(requestId);
                navigate("sources");
              }}
              openReview={(workId) => {
                setSelectedWorkId(workId);
                navigate("analyses");
              }}
            />
          ) : currentPage === "sources" ? (
            <SourceClassification
              csrf={session.csrf}
              canClassify={canReview}
              onUnauthorized={unauthorize}
              initialRequestId={selectedRequestId}
            />
          ) : currentPage === "analyses" ? (
            <Analyses
              csrf={session.csrf}
              canReview={canReview}
              onUnauthorized={unauthorize}
              initialWorkId={selectedWorkId}
            />
          ) : currentPage === "financial" ? (
            <FinancialExceptions
              csrf={session.csrf}
              memberId={session.member.id}
              role={session.member.role}
              onUnauthorized={unauthorize}
            />
          ) : currentPage === "commissions" ? (
            <Commissions csrf={session.csrf} onUnauthorized={unauthorize} />
          ) : currentPage === "reconciliation" && canReview ? (
            <RegistryReconciliation csrf={session.csrf} />
          ) : currentPage === "onr-review" && canReview ? (
            <OnrPreviewReview csrf={session.csrf} />
          ) : currentPage === "registry-requests" && canReview ? (
            <RegistryRequestDirectory onUnauthorized={unauthorize} />
          ) : currentPage === "connections" && canReview ? (
            <Connections
              canRead={canReview}
              canRevoke={canReview}
              csrf={session.csrf}
              onUnauthorized={unauthorize}
              onToast={showToast}
            />
          ) : currentPage === "users" && canReview ? (
            <Users canRead={canReview} onUnauthorized={unauthorize} />
          ) : currentPage === "team-members" &&
            session.member.role === "administrator" ? (
            <TeamMembers
              isAdmin={session.member.role === "administrator"}
              onUnauthorized={unauthorize}
            />
          ) : currentPage === "analysis-providers" &&
            session.member.role === "administrator" ? (
            <AnalysisProviders
              csrf={session.csrf}
              onUnauthorized={unauthorize}
            />
          ) : currentPage === "passkeys" ? (
            <Passkeys csrf={session.csrf} />
          ) : (
            <Access />
          )}
        </main>
        <footer>AferisAI · Área restrita da equipe</footer>
      </div>
      {session && (
        <nav className="bottom-nav" aria-label="Atalhos da equipe">
          {visibleMobileItems.map((item) => (
            <button
              key={item}
              className={`bottom-nav-item${currentPage === item ? " active" : ""}`}
              onClick={() => navigate(item)}
              aria-current={currentPage === item ? "page" : undefined}
            >
              <span className="bottom-nav-icon">
                <ShellIcon name={item} size={21} />
              </span>
              <span>
                {item === "overview"
                  ? "Início"
                  : item === "financial"
                    ? "Exceções"
                    : item === "commissions"
                      ? "Repasses"
                      : nav.find((entry) => entry.page === item)?.label}
              </span>
            </button>
          ))}
          <button
            className={`bottom-nav-item${visibleMobileItems.includes(currentPage) ? "" : " active"}`}
            onClick={() => openMenu()}
            aria-label="Mais opções"
            aria-expanded={menuOpen}
          >
            <span className="bottom-nav-icon">
              <ShellIcon name="menu" size={21} />
            </span>
            <span>Mais</span>
          </button>
        </nav>
      )}
      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function ToastStack({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  const icons: Record<ToastKind, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role="status">
          <span className="toast-icon">{icons[t.kind]}</span>
          <span>{t.message}</span>
          <button
            className="toast-close"
            onClick={() => dismiss(t.id)}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function portalMode(): "team" | "partner" | "invitation" {
  if (window.location.hash.startsWith("#convite")) return "invitation";
  if (window.location.hash.startsWith("#parceiro")) return "partner";
  return "team";
}

function App() {
  const [portal, setPortal] = useState(portalMode);
  useEffect(() => {
    const update = () => setPortal(portalMode());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return portal === "team" ? <TeamApp /> : <PartnerPortal key={portal} />;
}

export default App;
