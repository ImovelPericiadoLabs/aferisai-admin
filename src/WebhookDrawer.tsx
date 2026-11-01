import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

export function WebhookDrawer({
  open,
  panelRef,
  busy,
  onClose,
  children,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return createPortal(
    <>
      {open && (
        <div
          className="detail-panel-overlay"
          onClick={() => !busy && onClose()}
        />
      )}
      <aside
        ref={panelRef}
        className={`detail-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="webhook-drawer-title"
        aria-hidden={!open}
      >
        {children}
      </aside>
    </>,
    document.body,
  );
}
