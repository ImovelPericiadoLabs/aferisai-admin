import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast, type Toast, type ToastKind } from "./useToast";
import {
  ApiError,
  createOrganization,
  createSession,
  currentMember,
  deleteSession,
  getDashboardMetrics,
  listOrganizations,
  renewCsrf,
  type DashboardMetrics,
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
import "./App.css";
import "./brand.css";
import "./directory.css";

type Page =
  | "overview"
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
  | "analysis-providers";
type Session = { csrf: string; member: TeamMember };

const nav: { page: Page; label: string; detail: string }[] = [
  { page: "overview", label: "Visão geral", detail: "Início" },
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
  { page: "commissions", label: "Financeiro", detail: "Obrigações e repasses" },
  { page: "connections", label: "Conexões", detail: "Consentimentos ativos" },
  { page: "users", label: "Usuários", detail: "Contas da plataforma" },
  { page: "team-members", label: "Membros", detail: "Equipe interna" },
  {
    page: "analysis-providers",
    label: "Provedores IA",
    detail: "Contas e limites",
  },
  { page: "access", label: "Acessos", detail: "Estrutura de autoridade" },
  {
    page: "reconciliation",
    label: "Conciliação",
    detail: "Submissões incertas",
  },
  { page: "onr-review", label: "Prévia ONR", detail: "Revisão de prévia" },
  {
    page: "registry-requests",
    label: "Reg. registrais",
    detail: "Todos os pedidos",
  },
];

function message(error: unknown): string {
  if (error instanceof ApiError) return error.detail;
  return "Não foi possível conectar à API. Confira a configuração e tente novamente.";
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand light />
        <div>
          <p className="eyebrow">Área interna · acesso restrito</p>
          <h1>Uma visão clara de cada parceria.</h1>
          <p>
            Organize as conexões da plataforma com controle sobre quem cria e
            acessa cada aplicação.
          </p>
        </div>
        <small>AferisAI · Operação e governança</small>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <p className="eyebrow">Bem-vindo de volta</p>
          <h2 id="login-title">Entrar na área da equipe</h2>
          <p className="muted">
            Use sua conta interna e o código atual do aplicativo autenticador.
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
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "Verificando…" : "Entrar com segurança"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="fine-print">
            Sua senha e o código do autenticador não são salvos neste navegador.
          </p>
        </div>
      </section>
    </main>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <img src={light ? "/logo-light.svg" : "/logo-dark.svg"} alt="AferisAI" />
      <span>Equipe</span>
    </div>
  );
}

const DASH_COLOR: Record<string, string> = {
  neutral: "inherit",
  blue: "#1d4ed8",
  green: "#047857",
  red: "#991b1b",
  yellow: "#92400e",
  orange: "#c2410c",
};

function StatTile({
  value,
  label,
  color,
  loading,
}: {
  value: number;
  label: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div>
      {loading ? (
        <div
          className="skeleton"
          style={{ height: "1.5rem", width: "3rem", marginBottom: "0.3rem" }}
        />
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: 700,
            color: DASH_COLOR[color] ?? "inherit",
            lineHeight: 1.1,
          }}
        >
          {value.toLocaleString("pt-BR")}
        </p>
      )}
      {loading ? (
        <div className="skeleton" style={{ height: "0.7rem", width: "4rem" }} />
      ) : (
        <p
          style={{
            margin: "0.2rem 0 0",
            fontSize: "0.75rem",
            color: "var(--muted)",
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
}

function DashCard({
  title,
  page,
  navigate,
  loading,
  children,
}: {
  title: string;
  page: Page;
  navigate: (p: Page) => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        <button
          type="button"
          className="button secondary"
          style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}
          disabled={loading}
          onClick={() => navigate(page)}
        >
          Ver →
        </button>
      </div>
      <div className="dashboard-stat-grid">{children}</div>
    </div>
  );
}

function Dashboard({
  navigate,
  canSeeCommissions,
  showToast,
}: {
  navigate: (page: Page) => void;
  canSeeCommissions: boolean;
  showToast: (msg: string, kind: ToastKind) => void;
}) {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  function fetchData() {
    setLoading(true);
    setLoadFailed(false);
    void getDashboardMetrics()
      .then((result) => {
        setData(result);
      })
      .catch(() => {
        setLoadFailed(true);
        showToast("Não foi possível carregar as métricas.", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showLoading = loading;
  const a = data?.analyses;
  const p = data?.payments;
  const r = data?.registry_requests;
  const c = data?.commissions;

  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Painel de operação</p>
          <h1>Visão geral</h1>
        </div>
        <span className="pill success">Sessão ativa</span>
      </header>

      {loadFailed ? (
        <div className="empty-state">
          <p>Não foi possível carregar as métricas.</p>
          <button
            type="button"
            className="button secondary"
            onClick={fetchData}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="cards">
          <DashCard
            title="Análises"
            page="analyses"
            navigate={navigate}
            loading={showLoading}
          >
            <StatTile
              value={a?.queued ?? 0}
              label="Na fila"
              color="neutral"
              loading={showLoading}
            />
            <StatTile
              value={a?.running ?? 0}
              label="Em execução"
              color="blue"
              loading={showLoading}
            />
            <StatTile
              value={a?.completed ?? 0}
              label="Concluídas"
              color="green"
              loading={showLoading}
            />
            <StatTile
              value={a?.error ?? 0}
              label="Com erro"
              color="red"
              loading={showLoading}
            />
          </DashCard>

          <DashCard
            title="Pagamentos"
            page="financial"
            navigate={navigate}
            loading={showLoading}
          >
            <StatTile
              value={p?.prepared ?? 0}
              label="Aguardando PIX"
              color="yellow"
              loading={showLoading}
            />
            <StatTile
              value={p?.received ?? 0}
              label="Recebidos"
              color="green"
              loading={showLoading}
            />
            <StatTile
              value={p?.review ?? 0}
              label="Em revisão"
              color="orange"
              loading={showLoading}
            />
          </DashCard>

          <DashCard
            title="Pedidos registrais"
            page="registry-requests"
            navigate={navigate}
            loading={showLoading}
          >
            <StatTile
              value={r?.pending ?? 0}
              label="Criados"
              color="neutral"
              loading={showLoading}
            />
            <StatTile
              value={r?.dispatched ?? 0}
              label="Despachados"
              color="blue"
              loading={showLoading}
            />
            <StatTile
              value={r?.confirmed ?? 0}
              label="Concluídos"
              color="green"
              loading={showLoading}
            />
            <StatTile
              value={r?.error ?? 0}
              label="Com erro"
              color="red"
              loading={showLoading}
            />
          </DashCard>

          {canSeeCommissions ? (
            <DashCard
              title="Comissões"
              page="commissions"
              navigate={navigate}
              loading={showLoading}
            >
              <StatTile
                value={c?.provisional ?? 0}
                label="Provisionadas"
                color="yellow"
                loading={showLoading}
              />
              <StatTile
                value={c?.owed ?? 0}
                label="A repassar"
                color="orange"
                loading={showLoading}
              />
              <StatTile
                value={c?.settled ?? 0}
                label="Repassadas"
                color="green"
                loading={showLoading}
              />
            </DashCard>
          ) : (
            <div className="card" style={{ opacity: 0.45 }}>
              <div className="card-header">
                <h2 className="card-title">Comissões</h2>
              </div>
              <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Restrito ao papel financeiro ou superior.
              </p>
            </div>
          )}
        </div>
      )}
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
          <h1>Organizações</h1>
          <p className="muted">
            Consulte as parcerias ou cadastre uma nova organização.
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
    value === "analysis-providers"
    ? value
    : "overview";
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();
  const unauthorize = useCallback(() => setSession(null), []);
  const navigate = useCallback((next: Page) => {
    setPage(next);
    window.location.hash = next === "overview" ? "" : next;
  }, []);

  useEffect(() => {
    const sync = () => setPage(pageFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

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
      <main className="loading" role="status" aria-label="Carregando">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            className="skeleton"
            style={{ width: "120px", height: "1.5rem" }}
          />
          <div
            className="skeleton"
            style={{ width: "200px", height: "0.875rem" }}
          />
          <div
            className="skeleton"
            style={{ width: "160px", height: "0.875rem" }}
          />
        </div>
      </main>
    );
  if (!session) return <Login onLogin={setSession} />;

  const canReview =
    session.member.role === "administrator" ||
    session.member.role === "manager";
  const isFinancial = session.member.role === "financial";
  const currentPage =
    isFinancial && page !== "commissions" ? "financial" : page;
  const visibleNav = nav.filter((item) =>
    isFinancial
      ? item.page === "financial" || item.page === "commissions"
      : item.page !== "financial" &&
        item.page !== "commissions" &&
        (item.page !== "requests" || canReview) &&
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

  return (
    <div className="shell">
      <aside
        className={`sidebar ${menuOpen ? "open" : ""}`}
        aria-label="Navegação principal"
      >
        <div className="sidebar-head">
          <Brand light />
          <button
            className="close-menu"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>
        <p className="nav-title">PLATAFORMA</p>
        <nav>
          {visibleNav.map((item) => (
            <button
              key={item.page}
              className={`nav-link ${currentPage === item.page ? "active" : ""}`}
              aria-current={currentPage === item.page ? "page" : undefined}
              onClick={() => {
                navigate(item.page);
                setMenuOpen(false);
              }}
            >
              <span className="nav-glyph" aria-hidden="true">
                {item.page === "overview"
                  ? "◫"
                  : item.page === "organizations"
                    ? "⊙"
                    : item.page === "commercial"
                      ? "%"
                      : item.page === "promotions"
                        ? "◉"
                        : item.page === "requests"
                          ? "≡"
                          : item.page === "sources"
                            ? "▣"
                            : item.page === "analyses"
                              ? "▤"
                              : item.page === "financial"
                                ? "¤"
                                : item.page === "commissions"
                                  ? "₊"
                                  : item.page === "reconciliation"
                                    ? "⇄"
                                    : item.page === "onr-review"
                                      ? "◎"
                                      : item.page === "registry-requests"
                                        ? "≡"
                                        : item.page === "connections"
                                          ? "⊕"
                                          : item.page === "users"
                                            ? "◯"
                                            : item.page === "team-members"
                                              ? "⊞"
                                              : "◇"}
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="account">
            <span>E</span>
            <div>
              <strong>{session.member.email}</strong>
              <small>
                {session.member.role === "administrator"
                  ? "Administrador geral"
                  : session.member.role === "manager"
                    ? "Gestor"
                    : session.member.role === "financial"
                      ? "Financeiro"
                      : "Leitor"}
              </small>
            </div>
          </div>
          <button className="logout" onClick={logout}>
            Sair da conta <span aria-hidden="true">↗</span>
          </button>
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
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
          <span>
            Área da equipe <b>/</b>{" "}
            {nav.find((item) => item.page === currentPage)?.label}
          </span>
          <span className="topbar-label">Ambiente interno</span>
        </header>
        <main key={currentPage} className="page-fade-in">
          {currentPage === "overview" ? (
            <Dashboard
              navigate={navigate}
              canSeeCommissions={session.member.role !== "viewer"}
              showToast={showToast}
            />
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
          ) : (
            <Access />
          )}
        </main>
        <footer>AferisAI · Área restrita da equipe</footer>
      </div>
      {session && (
        <nav className="bottom-nav" aria-label="Navegação principal">
          <button
            className={`bottom-nav-item${page === "overview" ? " active" : ""}`}
            onClick={() => navigate("overview")}
            aria-label="Visão geral"
          >
            <span className="bottom-nav-icon">⊞</span>
            <span>Início</span>
          </button>
          <button
            className={`bottom-nav-item${page === "analyses" ? " active" : ""}`}
            onClick={() => navigate("analyses")}
            aria-label="Análises"
          >
            <span className="bottom-nav-icon">◈</span>
            <span>Análises</span>
          </button>
          <button
            className={`bottom-nav-item${page === "requests" ? " active" : ""}`}
            onClick={() => navigate("requests")}
            aria-label="Pedidos"
          >
            <span className="bottom-nav-icon">⊟</span>
            <span>Pedidos</span>
          </button>
          {(session.member.role === "financial" ||
            session.member.role === "manager" ||
            session.member.role === "administrator") && (
            <button
              className={`bottom-nav-item${page === "financial" ? " active" : ""}`}
              onClick={() => navigate("financial")}
              aria-label="Exceções financeiras"
            >
              <span className="bottom-nav-icon">◉</span>
              <span>Finanças</span>
            </button>
          )}
          <button
            className="bottom-nav-item"
            onClick={() => setMenuOpen(true)}
            aria-label="Mais opções"
          >
            <span className="bottom-nav-icon">≡</span>
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

export default App;
