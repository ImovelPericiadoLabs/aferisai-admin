import { ShellIcon } from "./ShellIcon";
import { nav, type HiddenPage, type Page } from "./team-nav-model";

export function TeamBottomNav({
  items,
  home,
  currentPage,
  menuOpen,
  navigate,
  openMenu,
}: {
  items: Page[];
  home: Page;
  currentPage: Page | HiddenPage;
  menuOpen: boolean;
  navigate: (page: Page) => void;
  openMenu: () => void;
}) {
  const visibleMobileItems = items;
  return (
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
            {item === home
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
  );
}
