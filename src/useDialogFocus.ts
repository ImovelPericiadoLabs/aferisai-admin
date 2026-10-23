import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const openDialogs: symbol[] = [];

function focusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

export function useDialogFocus(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: {
    initialFocus?: () => HTMLElement | null | undefined;
    returnFocus?: () => HTMLElement | null | undefined;
  } = {},
) {
  const closeRef = useRef(onClose);
  const optionsRef = useRef(options);
  useEffect(() => {
    closeRef.current = onClose;
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!open) return;
    const token = Symbol("dialog");
    openDialogs.push(token);
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const target =
        optionsRef.current.initialFocus?.() ??
        (container ? focusables(container)[0] : undefined);
      target?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== token) return;
      const container = containerRef.current;
      if (event.key === "Escape") {
        closeRef.current();
      } else if (event.key === "Tab" && container) {
        const items = focusables(container);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const current = document.activeElement;
        if (!container.contains(current)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && current === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && current === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      openDialogs.splice(openDialogs.indexOf(token), 1);
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      const back = optionsRef.current.returnFocus?.() ?? opener;
      if (back && document.contains(back)) back.focus();
    };
  }, [open, containerRef]);
}
