import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ApiError,
  acceptPartnerOrganizationInvitation,
  createPartnerSession,
  deletePartnerSupportSession,
  currentPartnerMember,
  deletePartnerSession,
  listPartnerApplicationPermissions,
  listPartnerApplications,
  renewPartnerCsrf,
  ownerPeopleApi,
  switchPartnerOrganization,
  type PartnerApplication,
  type PartnerMember,
  beginPartnerPasskeyLogin,
  finishPartnerPasskeyLogin,
} from "./api";
import { browserSupportsWebAuthn, startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { PartnerAuthShell } from "./PartnerAuthShell";
import { PartnerInvitation } from "./PartnerInvitation";
import { PartnerLoginForm } from "./PartnerLoginForm";
import { PartnerPortalHeader } from "./PartnerPortalHeader";
import { PartnerPortalSections } from "./PartnerPortalSections";
import type { IntegrationTab } from "./ApplicationWorkspace";
import { Breadcrumbs } from "./Breadcrumbs";
import { portalSections, type PortalSection } from "./partner-finance-model";
import { memberAccess } from "./partner-roles";
import { ToastStack } from "./ToastStack";
import { useToast } from "./useToast";
import { PartnerMfaRecovery } from "./PartnerMfaRecovery";
import { PartnerPasswordRecovery } from "./PartnerPasswordRecovery";
import "./partner-portal.css";

type PartnerSession = { member: PartnerMember; csrf: string };

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
  const [requestedSection, setSection] =
    useState<PortalSection>("integrations");
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const isInvitation = window.location.hash.startsWith("#convite");
  const pendingInvitationToken = new URLSearchParams(
    window.location.hash.split("?")[1] || "",
  ).get("convite") || "";
  const supportMode = new URLSearchParams(
    window.location.hash.split("?")[1] || "",
  ).get("suporte") === "1";
  const [recoveringMfa, setRecoveringMfa] = useState(() =>
    window.location.hash.startsWith("#recuperar-2fa"),
  );
  const [recoveringPassword, setRecoveringPassword] = useState(() =>
    window.location.hash.startsWith("#recuperar-senha"),
  );
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
        const supportCsrf = supportMode
          ? sessionStorage.getItem("aferis_partner_support_csrf")
          : null;
        const csrf = supportCsrf ? { csrf_token: supportCsrf } : await renewPartnerCsrf();
        if (live && csrf) setSession({ member, csrf: csrf.csrf_token });
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
  }, [supportMode]);

  const activeOrganizationId = session?.member.organization_id;
  const access = memberAccess(session?.member.role);
  const sections = portalSections(access);
  const section: PortalSection | null = sections.some(
    (item) => item.id === requestedSection,
  )
    ? requestedSection
    : (sections[0]?.id ?? null);
  const csrfForPeople = session?.csrf;
  const peopleApi = useMemo(
    () => (csrfForPeople && !supportMode ? ownerPeopleApi(csrfForPeople) : null),
    [csrfForPeople, supportMode],
  );
  useEffect(() => {
    if (!activeOrganizationId || !access.integrations) return;
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
  }, [activeOrganizationId, access.integrations, requestedCursor, unauthorize]);

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
      setSection("integrations");
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
      if (pendingInvitationToken) {
        const accepted = await acceptPartnerOrganizationInvitation(
          pendingInvitationToken,
          result.csrf_token,
        );
        await switchPartnerOrganization(accepted.organization_id, result.csrf_token);
        window.history.replaceState(null, "", "/#parceiro");
      }
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

  async function loginWithPasskey() {
    if (!email.trim()) {
      setError("Informe seu e-mail para entrar com a chave de acesso.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const options = await beginPartnerPasskeyLogin(email.trim());
      const credential = await startAuthentication({
        optionsJSON: options.public_key as unknown as PublicKeyCredentialRequestOptionsJSON,
      });
      const result = await finishPartnerPasskeyLogin(email.trim(), options.challenge_id, credential as unknown as Record<string, unknown>);
      const member = await currentPartnerMember();
      setSession({ member, csrf: result.csrf_token });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : "A chave de acesso não foi confirmada pelo dispositivo.");
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

  async function endSupport() {
    if (!session) return;
    setBusy(true);
    try {
      await deletePartnerSupportSession(session.csrf);
      sessionStorage.removeItem("aferis_partner_support_csrf");
      window.location.assign("/#");
    } catch {
      setError("Não foi possível encerrar o suporte. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function openMfaRecovery() {
    setError("");
    setRecoveringMfa(true);
    window.history.replaceState(null, "", "/#recuperar-2fa");
  }

  function closeMfaRecovery() {
    setRecoveringMfa(false);
    window.history.replaceState(null, "", "/#parceiro");
  }

  function openPasswordRecovery() {
    setError("");
    setRecoveringPassword(true);
    window.history.replaceState(null, "", "/#recuperar-senha");
  }

  function closePasswordRecovery() {
    setRecoveringPassword(false);
    window.history.replaceState(null, "", "/#parceiro");
  }

  if (isInvitation) return <PartnerInvitation />;
  if (recoveringMfa)
    return (
      <PartnerAuthShell>
        <PartnerMfaRecovery onBack={closeMfaRecovery} />
      </PartnerAuthShell>
    );
  if (recoveringPassword)
    return <PartnerPasswordRecovery onBack={closePasswordRecovery} />;
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
      <PartnerLoginForm
        email={email}
        password={password}
        otp={otp}
        busy={busy}
        error={error}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onOtpChange={setOtp}
        onSubmit={(event) => void login(event)}
        onRecoverMfa={openMfaRecovery}
        onRecoverPassword={openPasswordRecovery}
        onPasskey={() => void loginWithPasskey()}
        passkeyAvailable={browserSupportsWebAuthn()}
      />
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
      {supportMode && (
        <div className="alert alert-warning" role="status">
          Modo suporte ativo: você está visualizando este parceiro como administrador. Alterações estão bloqueadas.
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void endSupport()} disabled={busy}>Encerrar suporte</button>
        </div>
      )}
      <PartnerPortalHeader
        member={session.member}
        switching={switching}
        busy={busy}
        onSelectOrganization={changeOrganization}
        onUnauthorized={unauthorize}
        onLogout={() => void logout()}
      />
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
            <PartnerPortalSections
              sections={sections}
              section={section}
              member={session.member}
              peopleApi={peopleApi}
              applications={applications}
              appRecords={appRecords}
              selectedPermissions={selectedPermissions}
              selectedId={selectedId}
              csrf={session.csrf}
              hasMoreApplications={Boolean(applicationsCursor)}
              loadingMoreApplications={loadingMoreApplications}
              tab={tab}
              onSectionChange={setSection}
              onSelectApplication={setSelectedId}
              onLoadMoreApplications={loadMoreApplications}
              onTabChange={setTab}
              onUnauthorized={unauthorize}
              onToast={showToast}
              readOnly={supportMode}
            />
          </>
        )}
      </main>
      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
