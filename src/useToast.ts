import { useCallback, useRef, useState } from "react";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

let _next = 1;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const activeKeys = useRef(new Set<string>());

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const key = `${kind}:${message}`;
    if (activeKeys.current.has(key)) return;
    activeKeys.current.add(key);
    const id = _next++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    if (kind !== "error") {
      setTimeout(() => {
        activeKeys.current.delete(key);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => {
      const toast = prev.find((item) => item.id === id);
      if (toast) activeKeys.current.delete(`${toast.kind}:${toast.message}`);
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  return { toasts, show, dismiss };
}
