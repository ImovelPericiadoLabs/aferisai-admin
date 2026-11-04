import type { RailStep } from "./rail-model";
import "./journey-rail.css";

const STATE_WORD = {
  done: "concluído",
  current: "aqui",
  problem: "com problema",
  pending: "ainda não",
} as const;

/** The purchase drawn as a line of five stops; the stop that needs attention is ringed, in red when it is stuck. */
export function JourneyRail({ steps }: { steps: RailStep[] }) {
  return (
    <ol className="jr" aria-label="Etapas da compra">
      {steps.map((step) => (
        <li key={step.id} data-state={step.state}>
          <i aria-hidden="true" />
          <strong>{step.label}</strong>
          {step.detail && <small>{step.detail}</small>}
          <span className="sr-only">{STATE_WORD[step.state]}</span>
        </li>
      ))}
    </ol>
  );
}
