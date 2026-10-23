import {
  getOrganization,
  listCommercialPolicies,
  listCommissionEntries,
  listOrganizations,
  listTeamMembers,
} from "./api";
import { itemLabel, promotionKindLabel, teamRoleLabel } from "./display-labels";
import {
  filterOptions,
  pagedResult,
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

export const searchOrganizations: PickerSearch = (query) =>
  pagedResult(
    (cursor) => listOrganizations(query.trim(), cursor),
    (org) => ({ id: org.id, label: org.name, hint: org.slug }),
    query,
    false,
  );

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

export const searchPromotionPolicies: PickerSearch = (query) =>
  pagedResult(
    (cursor) => listCommercialPolicies(cursor),
    (policy) =>
      policy.channel === "promotion" && policy.status === "published"
        ? {
            id: policy.id,
            label: `${itemLabel(policy.item_code)} · ${promotionKindLabel(policy.attribution)}`,
            hint: `Vigência ${dateShort.format(new Date(policy.valid_from))} a ${dateShort.format(new Date(policy.valid_until))}`,
          }
        : null,
    query,
    true,
  );

export const searchCommissionEntries =
  (organizationId: string, status: string): PickerSearch =>
  (query) =>
    pagedResult(
      (cursor) =>
        listCommissionEntries(
          cursor,
          organizationId || undefined,
          status || undefined,
        ),
      (entry) => ({
        id: entry.id,
        label: `${money(entry.amount_cents)} · ${itemLabel(entry.item_kind)}`,
        hint: `Gerada em ${dateShort.format(new Date(entry.created_at))}`,
      }),
      query,
      true,
    );

export const LIMIT_NOTES = {
  policies:
    "A API de regras ainda não filtra por canal/estado: a busca vale só para as páginas já carregadas. Use “Carregar mais resultados”.",
  entries:
    "A API de comissões não busca por texto: a busca vale só para as páginas já carregadas. Use “Carregar mais resultados”.",
} as const;

export const searchTeamMembers =
  (role: "manager" | "financial"): PickerSearch =>
  (query) =>
    pagedResult(
      (cursor) => listTeamMembers(cursor),
      (member) =>
        member.status === "active" && member.role === role
          ? {
              id: member.id,
              label: member.email,
              hint: teamRoleLabel(member.role),
            }
          : null,
      query,
      true,
    );
