import { request } from "./api-core";

export type RegistrySupplierKind = "onr" | "infosimples";

export type RegistrySupplierAccount = {
  id: string;
  label: string;
  provider: RegistrySupplierKind;
  /** Digest that links orders and costs to the account; not a credential. */
  account_binding_sha256: string;
  credential_hint: string;
  status: "draft" | "active" | "suspended";
  version: number;
  created_at: string;
  updated_at: string;
};

export type RegistrySupplierPage = {
  items: RegistrySupplierAccount[];
  next_cursor: string | null;
};

export type RegistrySupplierCreate = {
  label: string;
  provider: RegistrySupplierKind;
  email: string;
  password: string;
  token: string | null;
  portal_account_sha256: string | null;
  state_login_cpf?: string | null;
  state_login_password?: string | null;
  state_pkcs12_cert?: string | null;
  state_pkcs12_password?: string | null;
  reason: string;
};

export type RegistrySupplierStateAuth = {
  state_login_cpf: string | null;
  state_login_password: string | null;
  state_pkcs12_cert: string | null;
  state_pkcs12_password: string | null;
  reason: string;
};

export const listRegistrySupplierAccounts = (cursor?: string) =>
  request<RegistrySupplierPage>(
    `/v1/team/registry-supplier-accounts?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );

export const createRegistrySupplierAccount = (
  body: RegistrySupplierCreate,
  csrfToken: string,
) =>
  request<RegistrySupplierAccount>("/v1/team/registry-supplier-accounts", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });

export const rotateRegistrySupplierStateAuth = (
  id: string,
  body: RegistrySupplierStateAuth,
  csrfToken: string,
) =>
  request<RegistrySupplierAccount>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(id)}/rotate-state-auth`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify(body),
    },
  );

const supplierDecision = (
  id: string,
  action: "activate" | "suspend",
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) =>
  request<RegistrySupplierAccount>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ expected_version: expectedVersion, reason }),
    },
  );

export const activateRegistrySupplierAccount = (
  id: string,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) => supplierDecision(id, "activate", expectedVersion, reason, csrfToken);

export const suspendRegistrySupplierAccount = (
  id: string,
  expectedVersion: number,
  reason: string,
  csrfToken: string,
) => supplierDecision(id, "suspend", expectedVersion, reason, csrfToken);

export type SupplierAccountSummary = {
  id: string;
  provider: RegistrySupplierKind;
  status: "draft" | "active" | "suspended";
  version: number;
  last_credential_change_at: string | null;
  tariff: {
    id: string;
    kind: "visualization_api";
    budget_cents: number;
    managed: boolean;
    valid_until: string | null;
  } | null;
  commercial_terms: { id: string; version: string; valid_until: string } | null;
  endpoint: { mode: "official" | "proxy"; key_configured: boolean } | null;
  usage: {
    last_7_days: { orders: number; cost_cents: number | null };
    last_30_days: { orders: number; cost_cents: number | null };
    last_use_at: string | null;
    cost_status: "not_reconciled";
  };
};

export const getSupplierAccountSummary = (accountId: string) =>
  request<SupplierAccountSummary>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/summary`,
    { method: "GET" },
  );

export type SupplierAccountActivity = {
  id: string;
  action: string;
  actor_team_member_id: string;
  reason: string;
  before: Record<string, string | number | boolean | null>;
  after: Record<string, string | number | boolean | null>;
  occurred_at: string;
};

export const listSupplierAccountEvents = (
  accountId: string,
  cursor?: string | null,
) =>
  request<{ items: SupplierAccountActivity[]; next_cursor: string | null }>(
    `/v1/team/registry-supplier-accounts/${encodeURIComponent(accountId)}/events?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { method: "GET" },
  );
