import { useCallback, useEffect, useRef, useState } from "react";

/** Mobile drawer and account dropdown: open state, focus handling, dismissal. */
export function useShellMenus() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountActionRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
  }, []);
  const openMenu = useCallback(() => {
    setAccountMenuOpen(false);
    setMenuOpen(true);
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

  return {
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
  };
}
