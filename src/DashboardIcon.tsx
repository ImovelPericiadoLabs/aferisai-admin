import type { DashboardGroup } from "./dashboard-model";

export function Icon({
  name,
}: {
  name:
    DashboardGroup["icon"] | "arrow" | "refresh" | "chart" | "empty" | "info";
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    analysis: (
      <>
        <path d="M6 3.5h9l3 3V20H6z" />
        <path d="M15 3.5V7h3M9 11h6M9 14h6M9 17h4" />
      </>
    ),
    registry: (
      <>
        <path d="M4 8 12 4l8 4M6 9v9m4-9v9m4-9v9m4-9v9M4 20h16M3 8h18" />
      </>
    ),
    payment: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    commission: (
      <>
        <path d="M4 18V9m5 9V5m5 13v-7m5 7V8M3 20h18" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14-5L4 8m0-4v4h4M4 13a8 8 0 0 0 14 5l2-2m0 4v-4h-4" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5m0 14h16M8 16v-5m4 5V8m4 8V6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
    empty: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 10h8m-8 4h5" />
      </>
    ),
  };
  return (
    <svg
      className="dash-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
