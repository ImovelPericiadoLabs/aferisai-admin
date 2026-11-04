import type { ReactNode } from "react";

export type Application = {
  id: string;
  name: string;
  status: string;
  permissions: string[];
};
export type Permission = { code: string; description: string };
export type IntegrationTab =
  | "overview"
  | "profile"
  | "webhooks"
  | "deliveries"
  | "credentials"
  | "access"
  | "audit";
export type Tab = IntegrationTab;

export type Props = {
  applications: Application[];
  permissions: Permission[];
  selectedApplicationId: string | null;
  onSelectApplication: (id: string) => void;
  csrfToken: string;
  canManage: boolean;
  canEdit: boolean;
  onUnauthorized: () => void;
  permissionBusy: boolean;
  onTogglePermission: (
    applicationId: string,
    code: string,
    granted: boolean,
    reason?: string,
  ) => void;
  onGrantAllPermissions?: (applicationId: string, reason: string) => void;
  channel?: "team" | "partner";
  selectedTab?: IntegrationTab;
  onTabChange?: (tab: IntegrationTab) => void;
  /** Opens the partner documentation from an integration surface. */
  onOpenDocumentation?: () => void;
  additionalApplication: ReactNode;
  onLoadMoreApplications?: () => void;
  hasMoreApplications?: boolean;
  loadingMoreApplications?: boolean;
  /** Administrator-only terminal deletion of the open application (team channel). */
  onDeleteApplication?: (applicationId: string) => void;
};

export const tabIcons: Record<Tab, string> = {
  overview: "grid",
  profile: "edit",
  webhooks: "webhook",
  deliveries: "activity",
  credentials: "key",
  access: "shield",
  audit: "history",
};

export const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "profile", label: "Perfil público" },
  { id: "webhooks", label: "Webhooks" },
  { id: "deliveries", label: "Entregas" },
  { id: "credentials", label: "Credenciais" },
  { id: "access", label: "Acessos" },
  { id: "audit", label: "Auditoria" },
];
