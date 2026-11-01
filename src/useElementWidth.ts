import { useLayoutEffect, useState } from "react";

export function useElementWidth<T extends HTMLElement>() {
  // A callback ref, so a node that is unmounted and mounted again is measured again.
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!node) return;
    setWidth(node.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setWidth(node.clientWidth));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width] as const;
}
