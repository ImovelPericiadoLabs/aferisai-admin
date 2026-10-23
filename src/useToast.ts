import { useState, useCallback } from "react";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

let _next = 1;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = _next++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    if (kind !== "error") {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
