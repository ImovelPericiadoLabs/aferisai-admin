import type { RefObject } from "react";
import { ShellIcon } from "./ShellIcon";
import {
  navGroups,
  navParentOf,
  type HiddenPage,
  type NavItem,
  type Page,
} from "./team-nav-model";
import { Brand } from "./TeamBrand";

export function TeamSidebar({
  sidebarRef,
  menuCloseRef,
  menuOpen,
  sidebarCollapsed,
  onToggleCollapsed,
  visibleNav,
  currentPage,
  navigate,
  closeMenu,
}: {
  sidebarRef: RefObject<HTMLElement | null>;
  menuCloseRef: RefObject<HTMLButtonElement | null>;
  menuOpen: boolean;
  sidebarCollapsed: boolean;
  onToggleCollapsed: () => void;
  visibleNav: NavItem[];
  currentPage: Page | HiddenPage;
  navigate: (page: Page) => void;
  closeMenu: () => void;
}) {
  return (
    <>
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
            onClick={() => onToggleCollapsed()}
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
            const activeGroup = items.some(
              (item) => item.page === navParentOf(currentPage),
            );
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
                      className={`nav-link ${navParentOf(currentPage) === item.page ? "active" : ""}`}
                      aria-current={
                        navParentOf(currentPage) === item.page
                          ? "page"
                          : undefined
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
    </>
  );
}
