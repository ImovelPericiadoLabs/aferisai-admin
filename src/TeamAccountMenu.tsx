import type { RefObject } from "react";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { teamRoleLabel } from "./display-labels";
import { ShellIcon } from "./ShellIcon";
import type { HiddenPage, NavItem, Page } from "./team-nav-model";
import type { Session } from "./team-session";

export function TeamAccountMenu({
  session,
  accountMenuOpen,
  setAccountMenuOpen,
  accountMenuRef,
  accountActionRef,
  visibleNav,
  currentPage,
  navigate,
  closeMenu,
  logout,
  logoutError,
  sitePreviewBusy,
  openSitePreview,
}: {
  session: Session;
  accountMenuOpen: boolean;
  setAccountMenuOpen: (update: boolean | ((open: boolean) => boolean)) => void;
  accountMenuRef: RefObject<HTMLDivElement | null>;
  accountActionRef: RefObject<HTMLButtonElement | null>;
  visibleNav: NavItem[];
  currentPage: Page | HiddenPage;
  navigate: (page: Page) => void;
  closeMenu: () => void;
  logout: () => Promise<void>;
  logoutError: string;
  sitePreviewBusy: boolean;
  openSitePreview: () => Promise<void>;
}) {
  return (
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
              aria-current={currentPage === "passkeys" ? "page" : undefined}
              onClick={() => {
                navigate("passkeys");
                closeMenu();
              }}
            >
              <ShellIcon name="passkeys" size={17} /> Minhas chaves
            </button>
            {session.member.role === "administrator" &&
              browserSupportsWebAuthn() && (
                <button
                  type="button"
                  disabled={sitePreviewBusy}
                  onClick={() => void openSitePreview()}
                >
                  <ShellIcon name="passkeys" size={17} />{" "}
                  {sitePreviewBusy ? "Confirmando…" : "Abrir prévia do site"}
                </button>
              )}
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
                  aria-current={currentPage === item.page ? "page" : undefined}
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
  );
}
