import type { TaskKind } from "./work-queue-model";

const PATHS: Record<TaskKind, string> = {
  case: "M3 7h18v10H3zM3 11h18M7 15h3",
  send: "M4 8h13m0 0-3-3m3 3-3 3M20 16H7m0 0 3-3m-3 3 3 3",
  preview:
    "M12 5c5 0 8 7 8 7s-3 7-8 7-8-7-8-7 3-7 8-7zm0 4a3 3 0 100 6 3 3 0 000-6z",
  analysis: "M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3zM9 12l2 2 4-4",
  source: "M7 3h7l4 4v14H7zM14 3v5h4",
};

/** A quiet outline mark for a kind of task, one set, one stroke. */
export function KindGlyph({
  kind,
  size = 18,
}: {
  kind: TaskKind;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[kind]} />
    </svg>
  );
}
