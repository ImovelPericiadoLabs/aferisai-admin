import { useEffect, useRef, useState } from "react";

/** Animates from the previous value to `target`; jumps straight there with reduced motion. */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const from = current.current;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || from === target) {
      const id = requestAnimationFrame(() => {
        current.current = target;
        setValue(target);
      });
      return () => cancelAnimationFrame(id);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * (1 - Math.pow(1 - progress, 3));
      current.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
