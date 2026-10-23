import type { ReactNode } from "react";

const shapes: Record<string, ReactNode> = {
  webhook: (
    <>
      <circle cx="7" cy="16" r="2.5" />
      <circle cx="17" cy="16" r="2.5" />
      <circle cx="12" cy="6.5" r="2.5" />
      <path d="m12 9 -3.6 5.2M14.4 6.5c2.8.6 4.6 3 4.6 5.5M9.5 16h5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H21m-3 0v3m-3-3v2" />
    </>
  ),
  shield: (
    <path d="M12 3 4.5 6v5.5c0 4.4 3 7.6 7.5 9.5 4.5-1.9 7.5-5.1 7.5-9.5V6z" />
  ),
  activity: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
  server: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <path d="M8 7h.01M8 17h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
};

export function IntegrationIcon({
  name,
  size = 18,
}: {
  name: keyof typeof shapes | string;
  size?: number;
}) {
  return (
    <svg
      className="int-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name] ?? shapes.shield}
    </svg>
  );
}
