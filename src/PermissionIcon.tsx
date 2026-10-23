import type { ReactNode } from "react";

export function PermissionIcon({ code }: { code: string }) {
  const shapes: Record<string, ReactNode> = {
    "application:read": (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M4 9h16M9 9v10" />
      </>
    ),
    "analysis:read": (
      <>
        <path d="M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6" />
      </>
    ),
    "analysis:submit:upload": (
      <>
        <path d="M5 15v5h14v-5M12 16V4m-4 4 4-4 4 4" />
      </>
    ),
    "analysis:create": (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M11 7v8m-4-4h8M16 16l5 5" />
      </>
    ),
    "analysis:write": (
      <>
        <path d="M5 3h11l3 3v14H5zM15 3v4h4M8 16l6-6 2 2-6 6H8z" />
      </>
    ),
    "registry:read": (
      <>
        <path d="M3 9 12 4l9 5M5 10h14M7 11v8m5-8v8m5-8v8M4 21h16" />
      </>
    ),
    "registry:create": (
      <>
        <path d="M5 4h10l4 4v12H5zM15 4v5h4M9 14h6m-3-3v6" />
      </>
    ),
    "registry:write": (
      <>
        <path d="M4 5h12l4 4v11H4zM16 5v5h4M8 16l6-6 2 2-6 6H8z" />
      </>
    ),
  };
  return (
    <span className="appdir-permission-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {shapes[code] ?? (
          <path d="M12 3 4 7v6c0 4.5 3 7 8 9 5-2 8-4.5 8-9V7z" />
        )}
      </svg>
    </span>
  );
}
