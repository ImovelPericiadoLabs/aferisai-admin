import {
  getOrganization,
  listCommercialPolicies,
  listCommissionEntries,
  listOrganizations,
} from "./api";
import { itemLabel, promotionKindLabel } from "./display-labels";
import {
  filterOptions,
  type PickerOption,
  type PickerSearch,
} from "./picker-model";

const dateShort = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

export const searchOrganizations: PickerSearch = async (query) => {
  const page = await listOrganizations(query.trim());
  return {
    options: page.items.map((org) => ({
      id: org.id,
      label: org.name,
      hint: org.slug,
    })),
    truncated: page.next_cursor !== null,
  };
};

export const resolveOrganization = async (
  id: string,
): Promise<PickerOption | null> => {
  const org = await getOrganization(id);
  return { id: org.id, label: org.name, hint: org.slug };
};

async function organizationApplications(
  organizationId: string,
): Promise<PickerOption[]> {
  if (!organizationId) return [];
  const detail = await getOrganization(organizationId);
  return detail.applications.map((app) => ({ id: app.id, label: app.name }));
}

export const searchApplications =
  (organizationId: string): PickerSearch =>
  async (query) => ({
    options: filterOptions(
      await organizationApplications(organizationId),
      query,
    ),
  });

export const resolveApplication =
  (organizationId: string) =>
  async (id: string): Promise<PickerOption | null> =>
    (await organizationApplications(organizationId)).find(
      (app) => app.id === id,
    ) ?? null;

export const searchPromotionPolicies: PickerSearch = async (query) => {
  const page = await listCommercialPolicies();
  const options = page.items
    .filter(
      (policy) =>
        policy.channel === "promotion" && policy.status === "published",
    )
    .map((policy) => ({
      id: policy.id,
      label: `${itemLabel(policy.item_code)} · ${promotionKindLabel(policy.attribution)}`,
      hint: `Vigência ${dateShort.format(new Date(policy.valid_from))} a ${dateShort.format(new Date(policy.valid_until))}`,
    }));
  return {
    options: filterOptions(options, query),
    truncated: page.next_cursor !== null,
  };
};

export const searchCommissionEntries =
  (organizationId: string, status: string): PickerSearch =>
  async (query) => {
    const page = await listCommissionEntries(
      undefined,
      organizationId || undefined,
      status || undefined,
    );
    const options = page.items.map((entry) => ({
      id: entry.id,
      label: `${money(entry.amount_cents)} · ${itemLabel(entry.item_kind)}`,
      hint: `Gerada em ${dateShort.format(new Date(entry.created_at))}`,
    }));
    return {
      options: filterOptions(options, query),
      truncated: page.next_cursor !== null,
    };
  };

export const LIMIT_NOTES = {
  policies:
    "A API de regras ainda não filtra por canal/estado nem busca por texto: só as 20 versões mais recentes são consideradas.",
  entries:
    "A API de comissões não busca por texto: só as 20 obrigações mais recentes do filtro são listadas.",
} as const;
