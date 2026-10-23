import { useEffect, useState } from "react";
import { useCountUp } from "./useCountUp";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ReadinessRing({ percent }: { percent: number }) {
  const [drawn, setDrawn] = useState(0);
  const shown = useCountUp(percent);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);
  return (
    <div
      className="ring"
      role="img"
      aria-label={`Prontidão da integração: ${percent}%`}
      data-complete={percent === 100}
    >
      <svg viewBox="0 0 132 132" aria-hidden="true">
        <circle className="ring-track" cx="66" cy="66" r={RADIUS} />
        <circle
          className="ring-value"
          cx="66"
          cy="66"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - drawn / 100)}
        />
      </svg>
      <span className="ring-label">
        {Math.round(shown)}
        <small>%</small>
      </span>
    </div>
  );
}
