import type { ReactNode } from "react";

type IconName =
  | "overview"
  | "reports"
  | "organizations"
  | "commercial"
  | "promotions"
  | "requests"
  | "sources"
  | "analyses"
  | "financial"
  | "commissions"
  | "access"
  | "reconciliation"
  | "onr-review"
  | "registry-requests"
  | "connections"
  | "users"
  | "team-members"
  | "analysis-providers"
  | "registry-suppliers"
  | "passkeys"
  | "settings"
  | "operations-group"
  | "commercial-group"
  | "finance-group"
  | "menu"
  | "panel-open"
  | "panel-close"
  | "close"
  | "chevron"
  | "logout";

const paths: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V10m5 10V4m5 16v-7m5 7V8" />
      <path d="M2 21h20" />
    </>
  ),
  organizations: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 21v-5h6v5M8 8h2m4 0h2M8 12h2m4 0h2" />
    </>
  ),
  commercial: (
    <>
      <path d="M4 7h16M4 12h16M4 17h9" />
      <circle cx="18" cy="17" r="2" />
    </>
  ),
  promotions: (
    <>
      <path d="M3 12l8-9h9a1 1 0 0 1 1 1v9l-9 8a2 2 0 0 1-3 0l-6-6a2 2 0 0 1 0-3Z" />
      <circle cx="16.5" cy="7.5" r="1" />
    </>
  ),
  requests: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  sources: (
    <>
      <path d="M6 3h8l4 4v4M14 3v5h4M6 3v18h7" />
      <circle cx="15" cy="15" r="4" />
      <path d="m18 18 3 3" />
    </>
  ),
  analyses: (
    <>
      <path d="M12 2 4 6v6c0 5 3.2 8.2 8 10 4.8-1.8 8-5 8-10V6l-8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  financial: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 9h18M7 16h4" />
    </>
  ),
  commissions: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9a3 3 0 0 0-5.2-1.8c-1.7 2 0 3.2 2.2 4 2.4.9 3.7 2 2 4.1A3.5 3.5 0 0 1 8 16m4-11v2m0 10v2" />
    </>
  ),
  access: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
    </>
  ),
  reconciliation: (
    <>
      <path d="M4 7h16l-3-3m3 3-3 3M20 17H4l3-3m-3 3 3 3" />
    </>
  ),
  "onr-review": (
    <>
      <path d="M12 3 3 7l9 4 9-4-9-4ZM3 12l9 4 9-4M3 17l9 4 9-4" />
    </>
  ),
  "registry-requests": (
    <>
      <path d="m3 9 9-5 9 5M4 10h16M5 20h14M3 22h18M7 11v8m5-8v8m5-8v8" />
    </>
  ),
  connections: (
    <>
      <path d="m10 13 4-4M8 16H6a4 4 0 0 1 0-8h3m7 0h2a4 4 0 0 1 0 8h-3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2m1-14a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5" />
    </>
  ),
  "team-members": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8h18M15 12h3M15 16h3M6 18c.5-2 5.5-2 6 0" />
      <circle cx="9" cy="13" r="2" />
    </>
  ),
  "analysis-providers": (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 8h8v8H8zM12 1v2m0 18v2M1 12h2m18 0h2" />
    </>
  ),
  "registry-suppliers": (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  passkeys: (
    <>
      <circle cx="8" cy="10" r="4" />
      <path d="M11 13h10v3h-3v3h-3v-3h-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.86 1.86-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 1.56V20h-2v-.04a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.86-1.86.06-.06A1.7 1.7 0 0 0 8.6 15 1.7 1.7 0 0 0 7.04 14H7v-2h.04A1.7 1.7 0 0 0 8.6 11a1.7 1.7 0 0 0-.34-1.88l-.06-.06L10.06 7.2l.06.06A1.7 1.7 0 0 0 12 7.6a1.7 1.7 0 0 0 1-1.56V6h2v.04a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.86 1.86-.06.06A1.7 1.7 0 0 0 19.4 11a1.7 1.7 0 0 0 1.56 1H21v2h-.04A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  "operations-group": (
    <>
      <path d="M3 8h6l2 3h10v9H3V8Z" />
      <path d="M3 8V5h7l2 3M8 15h8" />
    </>
  ),
  "commercial-group": (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18m-11 0v2h4v-2" />
    </>
  ),
  "finance-group": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9h9M12 12l-5 7" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  "panel-open": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16m5-11-3 3 3 3" />
    </>
  ),
  "panel-close": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16m4-11 3 3-3 3" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5 5 19" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
    </>
  ),
};

export function ShellIcon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
