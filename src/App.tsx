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
import { ToastStack } from "./ToastStack";
import { useToast } from "./useToast";
import {
  ApiError,
  beginPasskeyLogin,
  createSession,
  currentMember,
  deleteSession,
  finishPasskeyLogin,
  renewCsrf,
  type TeamMember,
} from "./api";
import { OrganizationContextSwitcher } from "./OrganizationContextSwitcher";
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
import type { PeopleTab } from "./people-model";
import { AnalysisProviders } from "./AnalysisProviders";
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import { RegistrySuppliers } from "./RegistrySuppliers";
import { Organizations } from "./Organizations";
import { DesignSystemGuide } from "./DesignSystemGuide";
import { IntegrationMap } from "./IntegrationMap";
import { Access } from "./Access";
import { Passkeys } from "./Passkeys";
import { installNoAutofill } from "./no-autofill";
import { ShellIcon } from "./ShellIcon";
import { DashboardOverview, DashboardReports } from "./DashboardOverview";
import { teamRoleLabel } from "./display-labels";
import { PartnerPortal } from "./PartnerPortal";
import { TeamInvitation } from "./TeamInvitation";
import "./App.css";
import "./brand.css";
import "./directory.css";
import "./operational-polish.css";
import "./shell.css";

type Page =
  | "overview"
  | "reports"
  | "executive"
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
  | "registry-suppliers"
  | "passkeys";
type HiddenPage = "design-system" | "integration-map";
type Session = { csrf: string; member: TeamMember };

const nav: { page: Page; label: string; detail: string }[] = [
  { page: "overview", label: "Visão geral", detail: "Início" },
  {
    page: "executive",
    label: "Painel executivo",
    detail: "Receita e operação",
  },
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
  {
    page: "registry-suppliers",
    label: "Fornecedores",
    detail: "Contas registrais",
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
  { title: "Painel", pages: ["overview", "executive", "reports"] },
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
          compact
            ? light
              ? "/icon-light.svg"
              : "/icon.svg"
            : light
              ? "/logo-light.svg"
              : "/logo-dark.svg"
        }
        alt="AferisAI"
      />
      {!compact && <span>Equipe</span>}
    </div>
  );
}

function pageFromHash(): Page | HiddenPage {
  const value = window.location.hash.slice(1);
  return value === "organizations" ||
    value === "reports" ||
    value === "executive" ||
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
    value === "registry-suppliers" ||
    value === "passkeys" ||
    value === "design-system" ||
    value === "integration-map"
    ? value
    : "overview";
}

function TeamApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page | HiddenPage>(pageFromHash);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => installNoAutofill(document.body), []);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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
    window.location.hash = next === "overview" ? "" : next;
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = pageFromHash();
      setPage(next);
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
          session.member.role === "administrator") &&
        (item.page !== "registry-suppliers" ||
          session.member.role === "administrator") &&
        (item.page !== "executive" || session.member.role === "administrator"),
  );
  const currentPage =
    visibleNav.some((item) => item.page === page) ||
    ((page === "design-system" || page === "integration-map") &&
      session.member.role === "administrator")
      ? page
      : isFinancial
        ? "financial"
        : "overview";
  const currentItem = nav.find((item) => item.page === currentPage);
  const peopleTabs: PeopleTab[] = [
    ...(canReview ? [{ page: "users" as const, label: "Usuários" }] : []),
    ...(session.member.role === "administrator"
      ? [{ page: "team-members" as const, label: "Equipe" }]
      : []),
  ];
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
            const activeGroup = items.some((item) => item.page === currentPage);
            return (
              <div
                className={`sidebar-nav-group${activeGroup ? " has-active" : ""}`}
                key={group.title}
              >
                {isPanel ? null : (
                  <p
                    className="nav-group-title"
                    id={`nav-group-${group.title}`}
                  >
                    {group.title}
                  </p>
                )}
                <div
                  className="nav-group-items"
                  role="group"
                  aria-labelledby={
                    isPanel ? undefined : `nav-group-${group.title}`
                  }
                  aria-label={isPanel ? group.title : undefined}
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
          <div className="topbar-account">
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
                    aria-current={
                      currentPage === "passkeys" ? "page" : undefined
                    }
                    onClick={() => {
                      navigate("passkeys");
                      closeMenu();
                    }}
                  >
                    <ShellIcon name="passkeys" size={17} /> Minhas chaves
                  </button>
                  {visibleNav.some((item) =>
                    [
                      "team-members",
                      "analysis-providers",
                      "registry-suppliers",
                      "access",
                    ].includes(item.page),
                  ) && <p>Configurações</p>}
                  {visibleNav
                    .filter((item) =>
                      [
                        "team-members",
                        "analysis-providers",
                        "registry-suppliers",
                        "access",
                      ].includes(item.page),
                    )
                    .map((item) => (
                      <button
                        key={item.page}
                        type="button"
                        aria-current={
                          currentPage === item.page ? "page" : undefined
                        }
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
                    setAccountMenuOpen((open) => !open);
                  }}
                  aria-expanded={accountMenuOpen}
                  aria-label={`Conta de ${session.member.email}, ${teamRoleLabel(session.member.role)}`}
                  title={session.member.email}
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
              </div>
            </div>
            {logoutError && (
              <p className="error" role="alert">
                {logoutError}
              </p>
            )}
          </div>
          {currentPage === "organizations" && (
            <OrganizationContextSwitcher
              selectedId={selectedOrganizationId}
              onSelect={setSelectedOrganizationId}
              onUnauthorized={unauthorize}
            />
          )}
        </header>
        <main key={currentPage} className="page-fade-in">
          {currentPage === "overview" ? (
            <DashboardOverview role={session.member.role} navigate={navigate} />
          ) : currentPage === "executive" &&
            session.member.role === "administrator" ? (
            <ExecutiveDashboard onUnauthorized={unauthorize} />
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
              selectedId={selectedOrganizationId}
              onSelect={setSelectedOrganizationId}
              onToast={showToast}
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
            <Users
              canRead={canReview}
              isAdmin={session.member.role === "administrator"}
              csrf={session.csrf}
              actorId={session.member.id}
              tabs={peopleTabs}
              onTab={navigate}
              onUnauthorized={unauthorize}
              onToast={showToast}
            />
          ) : currentPage === "team-members" &&
            session.member.role === "administrator" ? (
            <TeamMembers
              isAdmin={session.member.role === "administrator"}
              csrf={session.csrf}
              actorId={session.member.id}
              tabs={peopleTabs}
              onTab={navigate}
              onUnauthorized={unauthorize}
              onToast={showToast}
            />
          ) : currentPage === "analysis-providers" &&
            session.member.role === "administrator" ? (
            <AnalysisProviders
              csrf={session.csrf}
              onUnauthorized={unauthorize}
            />
          ) : currentPage === "registry-suppliers" &&
            session.member.role === "administrator" ? (
            <RegistrySuppliers
              csrf={session.csrf}
              onUnauthorized={unauthorize}
              onToast={showToast}
            />
          ) : currentPage === "design-system" ? (
            <DesignSystemGuide />
          ) : currentPage === "integration-map" ? (
            <IntegrationMap />
          ) : currentPage === "passkeys" ? (
            <Passkeys csrf={session.csrf} onUnauthorized={unauthorize} />
          ) : (
            <Access
              role={session.member.role}
              csrf={session.csrf}
              onUnauthorized={unauthorize}
            />
          )}
        </main>
        <footer>AferisAI</footer>
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
            className={`bottom-nav-item${(visibleMobileItems as string[]).includes(currentPage) ? "" : " active"}`}
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

function portalMode(): "team" | "partner" | "invitation" | "team-invitation" {
  if (window.location.hash.startsWith("#equipe-convite"))
    return "team-invitation";
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
  if (portal === "team-invitation") return <TeamInvitation />;
  return portal === "team" ? <TeamApp /> : <PartnerPortal key={portal} />;
}

export default App;
