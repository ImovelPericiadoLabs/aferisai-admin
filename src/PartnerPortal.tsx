import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ApiError,
  acceptPartnerOrganizationInvitation,
  confirmPartnerInvitation,
  createPartnerSession,
  currentPartnerMember,
  deletePartnerSession,
  enrollPartnerInvitation,
  listPartnerApplicationPermissions,
  listPartnerApplications,
  renewPartnerCsrf,
  switchPartnerOrganization,
  type PartnerApplication,
  type PartnerMember,
} from "./api";
import { PartnerOrganizationSwitcher } from "./PartnerOrganizationSwitcher";
import {
  ApplicationWorkspace,
  type IntegrationTab,
} from "./ApplicationWorkspace";
import { Breadcrumbs } from "./Breadcrumbs";
import "./partner-portal.css";

type PartnerSession = { member: PartnerMember; csrf: string };

function PartnerAuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="pp-auth">
      <div className="pp-auth-brand">
        <img src="/logo-dark.svg" alt="AferisAI" />
        <span>Integrações</span>
      </div>
      <div className="pp-auth-card card">{children}</div>
    </main>
  );
}

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
  const [existingMember, setExistingMember] = useState<PartnerMember | null>(
    null,
  );
  const [existingCsrf, setExistingCsrf] = useState("");

  useEffect(() => {
    let live = true;
    currentPartnerMember()
      .then(async (member) => {
        const csrf = await renewPartnerCsrf();
        if (live) {
          setExistingMember(member);
          setExistingCsrf(csrf.csrf_token);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function acceptExisting() {
    if (!existingCsrf) return;
    setBusy(true);
    setError("");
    try {
      const accepted = await acceptPartnerOrganizationInvitation(
        token,
        existingCsrf,
      );
      await switchPartnerOrganization(accepted.organization_id, existingCsrf);
      window.history.replaceState(null, "", "/#parceiro");
      window.location.reload();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível aceitar o convite.",
      );
      setBusy(false);
    }
  }

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

  const err = error && (
    <div className="alert alert-danger" role="alert">
      {error}
    </div>
  );
  return (
    <PartnerAuthShell>
      <p className="pp-kicker">Convite para parceria</p>
      {completed ? (
        <>
          <h1 className="pp-title">Acesso preparado</h1>
          <p className="form-hint">
            Seu autenticador está confirmado. Entre com seu e-mail, senha e
            código atual.
          </p>
          <a className="btn btn-primary btn-md" href="/#parceiro">
            Entrar na integração
          </a>
        </>
      ) : !token ? (
        <>
          <h1 className="pp-title">Convite não encontrado</h1>
          <p className="form-hint">
            Abra o link recebido por e-mail para preparar seu acesso.
          </p>
        </>
      ) : existingMember ? (
        <div className="pp-stack">
          <h1 className="pp-title">Adicionar empresa ao seu acesso</h1>
          <p className="form-hint">
            Convite para {existingMember.email}. Você poderá trocar de empresa
            no topo do painel.
          </p>
          {err}
          <button
            type="button"
            className="btn btn-primary btn-md"
            disabled={busy || !existingCsrf}
            onClick={() => void acceptExisting()}
          >
            {busy ? "Adicionando…" : "Aceitar convite"}
          </button>
        </div>
      ) : !secret ? (
        <form className="pp-stack" onSubmit={(event) => void enroll(event)}>
          <h1 className="pp-title">Crie seu acesso</h1>
          <p className="form-hint">
            Defina uma senha para a sua parceria. Depois, ative o código do
            autenticador.
          </p>
          <div className="form-field">
            <label className="form-field-label" htmlFor="partner-new-password">
              Senha
            </label>
            <input
              id="partner-new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={15}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <span className="form-hint">Use pelo menos 15 caracteres.</span>
          </div>
          {err}
          <button
            className="btn btn-primary btn-md"
            disabled={busy || password.length < 15}
          >
            {busy ? "Preparando…" : "Continuar"}
          </button>
        </form>
      ) : (
        <form className="pp-stack" onSubmit={(event) => void confirm(event)}>
          <h1 className="pp-title">Ative o autenticador</h1>
          <p className="form-hint">
            Adicione esta chave ao aplicativo autenticador. Ela aparece somente
            agora.
          </p>
          <div className="secret-reveal-box">
            <span className="form-field-label">Chave do autenticador</span>
            <code>{secret}</code>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="partner-confirm-otp">
              Código de 6 dígitos
            </label>
            <input
              id="partner-confirm-otp"
              className="input"
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
          {err}
          <button
            className="btn btn-primary btn-md"
            disabled={busy || otp.length !== 6}
          >
            {busy ? "Confirmando…" : "Confirmar acesso"}
          </button>
        </form>
      )}
    </PartnerAuthShell>
  );
}

export function PartnerPortal() {
  const [session, setSession] = useState<PartnerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [applicationsCursor, setApplicationsCursor] = useState<string | null>(
    null,
  );
  const [requestedCursor, setRequestedCursor] = useState<string | undefined>();
  const [loadingMoreApplications, setLoadingMoreApplications] = useState(false);
  const [permissions, setPermissions] = useState<
    Record<string, { code: string; description: string }[]>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<IntegrationTab>("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const isInvitation = window.location.hash.startsWith("#convite");
  const unauthorize = useCallback(() => {
    setSession(null);
    setApplications([]);
    setApplicationsCursor(null);
    setRequestedCursor(undefined);
    setPermissions({});
    setSelectedId(null);
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

  const activeOrganizationId = session?.member.organization_id;
  useEffect(() => {
    if (!activeOrganizationId) return;
    let live = true;
    listPartnerApplications(requestedCursor)
      .then((result) => {
        if (!live) return;
        setApplications((current) =>
          requestedCursor ? [...current, ...result.items] : result.items,
        );
        setApplicationsCursor(result.next_cursor);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) unauthorize();
        else setError("Não foi possível carregar suas aplicações.");
      })
      .finally(() => {
        if (live) setLoadingMoreApplications(false);
      });
    return () => {
      live = false;
    };
  }, [activeOrganizationId, requestedCursor, unauthorize]);

  function loadMoreApplications() {
    if (!applicationsCursor || loadingMoreApplications) return;
    setLoadingMoreApplications(true);
    setRequestedCursor(applicationsCursor);
  }

  async function changeOrganization(organizationId: string) {
    if (!session) return;
    setSwitching(true);
    try {
      const member = await switchPartnerOrganization(
        organizationId,
        session.csrf,
      );
      setApplications([]);
      setApplicationsCursor(null);
      setRequestedCursor(undefined);
      setPermissions({});
      setSelectedId(null);
      setTab("overview");
      setError("");
      setSession({ ...session, member });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) unauthorize();
      throw cause;
    } finally {
      setSwitching(false);
    }
  }

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
      <PartnerAuthShell>
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando parceria"
        >
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </PartnerAuthShell>
    );
  if (!session)
    return (
      <PartnerAuthShell>
        <form className="pp-stack" onSubmit={(event) => void login(event)}>
          <p className="pp-kicker">Sua parceria</p>
          <h1 className="pp-title">Entre na sua integração</h1>
          <p className="form-hint">
            Consulte eventos, configure seu webhook e gerencie credenciais da
            sua aplicação.
          </p>
          <div className="form-field">
            <label className="form-field-label" htmlFor="partner-email">
              E-mail
            </label>
            <input
              id="partner-email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="partner-password">
              Senha
            </label>
            <input
              id="partner-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="partner-otp">
              Código do autenticador
            </label>
            <input
              id="partner-otp"
              className="input"
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
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-md" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <a className="pp-link" href="/#">
            Acesso da equipe
          </a>
        </form>
      </PartnerAuthShell>
    );

  const selectedPermissions = application
    ? permissions[application.id] || []
    : [];
  const visibleApplications = session.member.organization_id
    ? applications
    : [];
  const appRecords = visibleApplications.map((item) => ({
    ...item,
    permissions: permissions[item.id]?.map((entry) => entry.code) || [],
  }));

  return (
    <div className="pp-shell">
      <header className="pp-topbar">
        <div className="pp-topbar-brand">
          <img src="/logo-dark.svg" alt="AferisAI" />
          <span>Integrações</span>
        </div>
        <PartnerOrganizationSwitcher
          activeId={session.member.organization_id}
          activeName={session.member.organization_name}
          disabled={switching}
          onSelect={changeOrganization}
          onUnauthorized={unauthorize}
        />
        <div className="pp-account">
          <span className="pp-avatar" aria-hidden="true">
            {session.member.email.slice(0, 2).toUpperCase()}
          </span>
          <span className="pp-account-email">{session.member.email}</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => void logout()}
          >
            Sair
          </button>
        </div>
      </header>
      <main className="page pp-content">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {!session.member.organization_id ? (
          <div className="empty-state" role="status">
            <strong>Escolha uma empresa</strong>
            <span>
              Selecione no topo uma empresa à qual você tem acesso para ver as
              aplicações.
            </span>
          </div>
        ) : (
          <>
            <Breadcrumbs
              items={[
                {
                  label: session.member.organization_name || "Minha parceria",
                  onSelect:
                    application && appRecords.length > 1
                      ? () => setSelectedId(null)
                      : undefined,
                },
                ...(application && appRecords.length > 1
                  ? [{ label: application.name }]
                  : []),
              ]}
            />
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
              hasMoreApplications={Boolean(applicationsCursor)}
              loadingMoreApplications={loadingMoreApplications}
              onLoadMoreApplications={loadMoreApplications}
              channel="partner"
              selectedTab={tab}
              onTabChange={setTab}
            />
          </>
        )}
      </main>
    </div>
  );
}
