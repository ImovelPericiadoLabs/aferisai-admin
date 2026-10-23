import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  confirmPartnerInvitation,
  createPartnerSession,
  currentPartnerMember,
  deletePartnerSession,
  enrollPartnerInvitation,
  listPartnerApplicationPermissions,
  listPartnerApplications,
  renewPartnerCsrf,
  type PartnerApplication,
  type PartnerMember,
} from "./api";
import {
  ApplicationWorkspace,
  type IntegrationTab,
} from "./ApplicationWorkspace";
import "./partner-portal.css";

type PartnerSession = { member: PartnerMember; csrf: string };
const partnerNav: { tab: IntegrationTab; label: string; icon: string }[] = [
  { tab: "overview", label: "Visão geral", icon: "⌂" },
  { tab: "webhooks", label: "Webhooks", icon: "↗" },
  { tab: "deliveries", label: "Entregas", icon: "▤" },
  { tab: "credentials", label: "Credenciais", icon: "⚿" },
  { tab: "access", label: "Acessos", icon: "◫" },
];

function Invitation() {
  const token =
    new URLSearchParams(window.location.hash.split("?")[1] || "").get(
      "token",
    ) || "";
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await enrollPartnerInvitation(token, password);
      setSecret(result.totp_secret);
      setPassword("");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível preparar o acesso. Confira o convite e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await confirmPartnerInvitation(token, otp);
      setSecret("");
      setOtp("");
      setCompleted(true);
      window.history.replaceState(null, "", "/#convite");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível confirmar o autenticador.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="partner-auth">
      <div className="partner-auth-brand">
        <img src="/logo-dark.svg" alt="AferisAI" />
        <span>Integrações</span>
      </div>
      <div className="partner-auth-form">
        <p className="integration-kicker">Convite para parceria</p>
        {completed ? (
          <>
            <h1>Acesso preparado</h1>
            <p>
              Seu autenticador está confirmado. Entre com seu e-mail, senha e
              código atual.
            </p>
            <a className="button primary" href="/#parceiro">
              Entrar na integração
            </a>
          </>
        ) : !token ? (
          <>
            <h1>Convite não encontrado</h1>
            <p>Abra o link recebido por e-mail para preparar seu acesso.</p>
          </>
        ) : !secret ? (
          <form onSubmit={(event) => void enroll(event)}>
            <h1>Crie seu acesso</h1>
            <p>
              Defina uma senha para a sua parceria. Depois, ative o código do
              autenticador.
            </p>
            <div className="field">
              <label htmlFor="partner-new-password">Senha</label>
              <input
                id="partner-new-password"
                type="password"
                autoComplete="new-password"
                minLength={15}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <small>Use pelo menos 15 caracteres.</small>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={busy || password.length < 15}
            >
              {busy ? "Preparando…" : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={(event) => void confirm(event)}>
            <h1>Ative o autenticador</h1>
            <p>
              Adicione esta chave ao aplicativo autenticador. Ela aparece
              somente agora.
            </p>
            <div className="partner-secret">
              <span>Chave do autenticador</span>
              <code>{secret}</code>
            </div>
            <div className="field">
              <label htmlFor="partner-confirm-otp">Código de 6 dígitos</label>
              <input
                id="partner-confirm-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
                required
              />
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={busy || otp.length !== 6}
            >
              {busy ? "Confirmando…" : "Confirmar acesso"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export function PartnerPortal() {
  const [session, setSession] = useState<PartnerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [permissions, setPermissions] = useState<
    Record<string, { code: string; description: string }[]>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<IntegrationTab>("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const isInvitation = window.location.hash.startsWith("#convite");
  const unauthorize = useCallback(() => {
    setSession(null);
    setApplications([]);
  }, []);

  useEffect(() => {
    let live = true;
    currentPartnerMember()
      .then(async (member) => {
        const csrf = await renewPartnerCsrf();
        if (live) setSession({ member, csrf: csrf.csrf_token });
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

  useEffect(() => {
    if (!session) return;
    let live = true;
    listPartnerApplications()
      .then((result) => {
        if (live) setApplications(result.items);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) unauthorize();
        else setError("Não foi possível carregar suas aplicações.");
      });
    return () => {
      live = false;
    };
  }, [session, unauthorize]);

  const application =
    applications.find((item) => item.id === selectedId) ??
    (applications.length === 1 ? applications[0] : undefined);
  useEffect(() => {
    if (!application || permissions[application.id]) return;
    let live = true;
    listPartnerApplicationPermissions(application.id)
      .then((result) => {
        if (live)
          setPermissions((current) => ({
            ...current,
            [application.id]: result.items,
          }));
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) unauthorize();
        else setError("Não foi possível carregar as permissões da aplicação.");
      });
    return () => {
      live = false;
    };
  }, [application, permissions, unauthorize]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await createPartnerSession({ email, password, otp });
      const member = await currentPartnerMember();
      setSession({ member, csrf: result.csrf_token });
      setPassword("");
      setOtp("");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível entrar. Confira os dados e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      await deletePartnerSession(session.csrf);
      unauthorize();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) unauthorize();
      else setError("Não foi possível confirmar a saída. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (isInvitation) return <Invitation />;
  if (loading)
    return (
      <main className="partner-auth">
        <div
          className="integration-skeleton"
          role="status"
          aria-label="Carregando parceria"
        >
          <i />
          <i />
          <i />
        </div>
      </main>
    );
  if (!session)
    return (
      <main className="partner-auth">
        <div className="partner-auth-brand">
          <img src="/logo-dark.svg" alt="AferisAI" />
          <span>Integrações</span>
        </div>
        <form
          className="partner-auth-form"
          onSubmit={(event) => void login(event)}
        >
          <p className="integration-kicker">Sua parceria</p>
          <h1>Entre na sua integração</h1>
          <p>
            Consulte eventos, configure seu webhook e gerencie credenciais da
            sua aplicação.
          </p>
          <div className="field">
            <label htmlFor="partner-email">E-mail</label>
            <input
              id="partner-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="partner-password">Senha</label>
            <input
              id="partner-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="partner-otp">Código do autenticador</label>
            <input
              id="partner-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              required
            />
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <a className="partner-team-link" href="/#">
            Acesso da equipe
          </a>
        </form>
      </main>
    );

  const selectedPermissions = application
    ? permissions[application.id] || []
    : [];
  const appRecords = applications.map((item) => ({
    ...item,
    permissions: permissions[item.id]?.map((entry) => entry.code) || [],
  }));

  return (
    <div className="partner-shell">
      <aside
        className={`partner-sidebar ${menuOpen ? "open" : ""}`}
        aria-label="Navegação da parceria"
      >
        <div className="partner-sidebar-brand">
          <img src="/logo-dark.svg" alt="AferisAI" />
          <span>Integrações</span>
        </div>
        <div className="partner-organization">
          <small>MINHA PARCERIA</small>
          <strong>{session.member.organization_name}</strong>
          <span>
            {applications.length === 1
              ? "1 aplicação"
              : `${applications.length} aplicações`}
          </span>
        </div>
        <nav aria-label="Integração">
          {partnerNav.map((item) => (
            <button
              key={item.tab}
              type="button"
              aria-current={tab === item.tab ? "page" : undefined}
              onClick={() => {
                setTab(item.tab);
                setMenuOpen(false);
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="partner-sidebar-foot">
          <div className="partner-account">
            <span>{session.member.email.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{session.member.email}</strong>
              <small>Parceiro</small>
            </div>
          </div>
          <button type="button" disabled={busy} onClick={() => void logout()}>
            Sair da conta
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="partner-backdrop"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="partner-main">
        <header className="partner-topbar">
          <button
            className="partner-menu-button"
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
          <span>{session.member.organization_name}</span>
          <strong>Minha integração</strong>
        </header>
        <main className="partner-content">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <ApplicationWorkspace
            applications={appRecords}
            permissions={selectedPermissions}
            selectedApplicationId={selectedId}
            onSelectApplication={setSelectedId}
            csrfToken={session.csrf}
            canManage
            canEdit
            onUnauthorized={unauthorize}
            permissionBusy={false}
            onTogglePermission={() => {}}
            additionalApplication={null}
            channel="partner"
            selectedTab={tab}
            onTabChange={setTab}
          />
        </main>
      </div>
    </div>
  );
}
