/**
 * Reference data for the integration map. Facts come from reading aferis-backend
 * (see docs/implementation/permission-map.md); "proposed" items are product
 * proposals, never presented as existing. Paths are relative to the backend repo.
 */
export type CatalogStatus = "implemented" | "partial" | "proposed";

export const statusLabel: Record<CatalogStatus, string> = {
  implemented: "Implementado",
  partial: "Parcial",
  proposed: "Proposta",
};

export type IntegrationMode = {
  id: string;
  name: string;
  actor: string;
  auth: string;
  permissions: string;
  status: CatalogStatus;
  note: string;
  source: string;
};

export type PermissionEntry = {
  code: string;
  title: string;
  status: CatalogStatus;
  grantedByDefault: boolean;
  unlocks: string;
  sensitive: boolean;
  source: string;
};

export type EventEntry = {
  name: string;
  direction: "saída" | "entrada";
  status: CatalogStatus;
  note: string;
  source: string;
};

export type MetricEntry = {
  name: string;
  status: CatalogStatus;
  scope: string;
  note: string;
};

export type GapEntry = {
  id: string;
  title: string;
  effect: string;
  source: string;
};
