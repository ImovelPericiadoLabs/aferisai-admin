import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";
import "./tour.css";

export type TourStep = {
  id: string;
  /** CSS selector of what to point at. Without one the step is a centered card. */
  target?: string;
  title: string;
  /** One short line. */
  body?: string;
  /** A picture instead of words. */
  visual?: ReactNode;
};

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8;

/**
 * A step-by-step tour that points at the real screen: the rest dims, the target stays lit and a small
 * card says one thing. Steps whose target is not on the screen (an empty list, a hidden button) are
 * skipped, so the tour never points at nothing.
 */
export function GuidedTour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  /** `completed` is true when the person reached the end, false when they skipped. */
  onClose: (completed: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [vw, setVw] = useState(() => window.innerWidth);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const playable = useMemo(
    () =>
      open
        ? steps.filter(
            (step) => !step.target || document.querySelector(step.target),
          )
        : [],
    [open, steps],
  );
  const step = playable[Math.min(index, playable.length - 1)];
  const last = index >= playable.length - 1;

  useDialogFocus(open && playable.length > 0, cardRef, () => onClose(false), {
    initialFocus: () => nextRef.current,
  });

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Keep the lit area on the target while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open || !step) return;
    const node = step.target
      ? document.querySelector<HTMLElement>(step.target)
      : null;
    if (!node) {
      setBox(null);
      return;
    }
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    node.scrollIntoView({
      block: "center",
      behavior: reduce ? "auto" : "smooth",
    });
    let frame = 0;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setBox({
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      });
      setVw(window.innerWidth);
    };
    const loop = (until: number) => {
      measure();
      if (performance.now() < until)
        frame = requestAnimationFrame(() => loop(until));
    };
    loop(performance.now() + 700);
    const again = () => measure();
    window.addEventListener("resize", again);
    window.addEventListener("scroll", again, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", again);
      window.removeEventListener("scroll", again, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight")
        setIndex((value) => Math.min(value + 1, playable.length - 1));
      if (event.key === "ArrowLeft")
        setIndex((value) => Math.max(value - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, playable.length]);

  if (!open || !step) return null;

  const narrow = vw < 640;
  const CARD_W = 320;
  let style: React.CSSProperties | undefined;
  if (!narrow && box) {
    const below = box.top + box.height + 14;
    const fitsBelow = below + 220 < window.innerHeight;
    style = {
      width: CARD_W,
      left: Math.max(12, Math.min(box.left, vw - CARD_W - 12)),
      top: fitsBelow ? below : Math.max(12, box.top - 14 - 200),
    };
  }

  return createPortal(
    <div className="tour">
      <div
        className="tour-scrim"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />
      {box && (
        <div
          className="tour-hole"
          aria-hidden="true"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
        />
      )}
      <div
        ref={cardRef}
        className="tour-card"
        data-centered={!box || undefined}
        data-sheet={narrow || undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={style}
      >
        <div
          className="tour-dots"
          role="img"
          aria-label={`Passo ${index + 1} de ${playable.length}`}
        >
          {playable.map((item, position) => (
            <span
              key={item.id}
              data-state={
                position === index ? "now" : position < index ? "done" : "next"
              }
            />
          ))}
        </div>
        <h2 id="tour-title">{step.title}</h2>
        {step.visual}
        {step.body && <p>{step.body}</p>}
        <div className="tour-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onClose(false)}
          >
            Pular
          </button>
          <span />
          {index > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => setIndex(index - 1)}
            >
              Voltar
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => (last ? onClose(true) : setIndex(index + 1))}
          >
            {last ? "Entendi" : "Próximo"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
