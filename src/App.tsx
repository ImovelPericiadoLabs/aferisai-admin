import { useCallback, useEffect, useState } from "react";
import { ApiError, deleteSession } from "./api";
import { OrganizationContextSwitcher } from "./OrganizationContextSwitcher";
import { installNoAutofill } from "./no-autofill";
import { ShellIcon } from "./ShellIcon";
import { PartnerPortal } from "./PartnerPortal";
import { TeamInvitation } from "./TeamInvitation";
import { TeamAccountMenu } from "./TeamAccountMenu";
import { TeamBottomNav } from "./TeamBottomNav";
import { TeamLogin } from "./TeamLogin";
import { TeamPageContent } from "./TeamPageContent";
import { TeamSidebar } from "./TeamSidebar";
import { ToastStack } from "./ToastStack";
import {
  bottomNavFor,
  canReviewRole,
  nav,
  pageFromHash,
  resolveCurrentPage,
  visibleNavFor,
  type HiddenPage,
  type Page,
} from "./team-nav-model";
import { teamErrorMessage } from "./team-session";
import { useShellMenus } from "./useShellMenus";
import { useSitePreview } from "./useSitePreview";
import { useTeamSession } from "./useTeamSession";
import { useToast } from "./useToast";
import "./App.css";
import "./brand.css";
import "./directory.css";
import "./operational-polish.css";
import "./shell.css";

function TeamApp() {
  const { session, setSession, loading, unauthorize } = useTeamSession();
  const [page, setPage] = useState<Page | HiddenPage>(pageFromHash);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => installNoAutofill(document.body), []);
  const {
    menuOpen,
    accountMenuOpen,
    setAccountMenuOpen,
    menuCloseRef,
    menuToggleRef,
    sidebarRef,
    accountMenuRef,
    accountActionRef,
    closeMenu,
    openMenu,
  } = useShellMenus();
  const [logoutError, setLogoutError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();
  const { sitePreviewBusy, openSitePreview } = useSitePreview(
    session,
    showToast,
  );
  const navigate = useCallback(
    (next: Page) => {
      setPage(next);
      setAccountMenuOpen(false);
      window.location.hash = next === "overview" ? "" : next;
    },
    [setAccountMenuOpen],
  );

  useEffect(() => {
    const sync = () => {
      const next = pageFromHash();
      setPage(next);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
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
      else setLogoutError(teamErrorMessage(cause));
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
  if (!session) return <TeamLogin onLogin={setSession} />;

  const role = session.member.role;
  const visibleNav = visibleNavFor(role);
  const currentPage = resolveCurrentPage(page, visibleNav, role);
  const currentItem = nav.find((item) => item.page === currentPage);
  const { home, items: visibleMobileItems } = bottomNavFor(role, visibleNav);

  return (
    <div className={`shell${sidebarCollapsed ? " shell-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo principal
      </a>
      <TeamSidebar
        sidebarRef={sidebarRef}
        menuCloseRef={menuCloseRef}
        menuOpen={menuOpen}
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        visibleNav={visibleNav}
        currentPage={currentPage}
        navigate={navigate}
        closeMenu={closeMenu}
      />
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
          <TeamAccountMenu
            session={session}
            accountMenuOpen={accountMenuOpen}
            setAccountMenuOpen={setAccountMenuOpen}
            accountMenuRef={accountMenuRef}
            accountActionRef={accountActionRef}
            visibleNav={visibleNav}
            currentPage={currentPage}
            navigate={navigate}
            closeMenu={closeMenu}
            logout={logout}
            logoutError={logoutError}
            sitePreviewBusy={sitePreviewBusy}
            openSitePreview={openSitePreview}
          />
          {currentPage === "organizations" && (
            <OrganizationContextSwitcher
              selectedId={selectedOrganizationId}
              onSelect={setSelectedOrganizationId}
              onUnauthorized={unauthorize}
            />
          )}
        </header>
        <main id="main-content" key={currentPage} className="page-fade-in">
          <TeamPageContent
            currentPage={currentPage}
            session={session}
            canReview={canReviewRole(role)}
            unauthorize={unauthorize}
            navigate={navigate}
            showToast={showToast}
            selectedOrganizationId={selectedOrganizationId}
            setSelectedOrganizationId={setSelectedOrganizationId}
            selectedRequestId={selectedRequestId}
            setSelectedRequestId={setSelectedRequestId}
            selectedWorkId={selectedWorkId}
            setSelectedWorkId={setSelectedWorkId}
            selectedCaseId={selectedCaseId}
            setSelectedCaseId={setSelectedCaseId}
          />
        </main>
        <footer>AferisAI</footer>
      </div>
      <TeamBottomNav
        items={visibleMobileItems}
        home={home}
        currentPage={currentPage}
        menuOpen={menuOpen}
        navigate={navigate}
        openMenu={openMenu}
      />
      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function portalMode(): "team" | "partner" | "invitation" | "team-invitation" {
  if (window.location.hash.startsWith("#equipe-convite"))
    return "team-invitation";
  if (window.location.hash.startsWith("#convite")) return "invitation";
  if (window.location.hash.startsWith("#recuperar-2fa")) return "partner";
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
