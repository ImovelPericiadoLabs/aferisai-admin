import type { OrganizationDetail } from "./api";

export type StatusFilter = "all" | "active" | "suspended";

export type DetailState = {
  id: string;
  data?: OrganizationDetail;
  error?: string;
};
