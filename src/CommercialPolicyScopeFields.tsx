import { useMemo } from "react";
import type { FormState, PolicyChannel } from "./commercial-model";
import type { OrganizationOption } from "./commercial-policy-form-types";
import { EntityPicker } from "./EntityPicker";
import {
  resolveApplication,
  resolveOrganization,
  searchApplications,
  searchOrganizations,
} from "./lookups";

const channels: { value: PolicyChannel; title: string; hint: string }[] = [
  { value: "site", title: "Site direto", hint: "Clientes sem parceiro" },
  { value: "integration", title: "Integração", hint: "Via API de um parceiro" },
  { value: "promotion", title: "Promoção", hint: "Cupom ou link" },
];

export function CommercialPolicyScopeFields({
  form,
  onChange,
  organizations,
  onUnauthorized,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
  organizations: OrganizationOption[];
  onUnauthorized: () => void;
}) {
  const needsOrganization = form.channel !== "site";
  const needsApplication = form.channel === "integration";
  const organizationId = form.organizationId.trim();
  const applicationsSearch = useMemo(
    () => searchApplications(organizationId),
    [organizationId],
  );
  const applicationResolver = useMemo(
    () => resolveApplication(organizationId),
    [organizationId],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value });
  }

  function chooseChannel(channel: PolicyChannel) {
    onChange({
      ...form,
      channel,
      attribution:
        channel === "site"
          ? "public"
          : channel === "integration"
            ? "connected"
            : "coupon",
    });
  }
  return (
    <fieldset className="form-section">
      <legend className="form-section-title">Onde vale</legend>
      <div
        className="choice-group"
        role="radiogroup"
        aria-label="Canal de venda"
      >
        {channels.map((channel) => (
          <button
            key={channel.value}
            type="button"
            role="radio"
            aria-checked={form.channel === channel.value}
            className="choice"
            onClick={() => chooseChannel(channel.value)}
          >
            <strong>{channel.title}</strong>
            <span>{channel.hint}</span>
          </button>
        ))}
      </div>
      {needsOrganization && (
        <EntityPicker
          onUnauthorized={onUnauthorized}
          id="policy-organization"
          label="Organização"
          placeholder="Buscar organização pelo nome"
          required
          value={form.organizationId}
          search={searchOrganizations}
          resolve={resolveOrganization}
          knownOptions={organizations.map((org) => ({
            id: org.id,
            label: org.name,
          }))}
          onChange={(id) =>
            onChange({ ...form, organizationId: id, applicationId: "" })
          }
        />
      )}
      {needsApplication && (
        <EntityPicker
          onUnauthorized={onUnauthorized}
          id="policy-application"
          label="Aplicação"
          placeholder={
            organizationId
              ? "Buscar aplicação"
              : "Escolha a organização primeiro"
          }
          required
          disabled={!organizationId}
          value={form.applicationId}
          search={applicationsSearch}
          resolve={applicationResolver}
          cacheKey={organizationId}
          onChange={(id) => set("applicationId", id)}
        />
      )}
      {form.channel === "promotion" && (
        <div className="form-field">
          <label className="form-field-label" htmlFor="policy-attribution">
            Origem da promoção
          </label>
          <select
            id="policy-attribution"
            className="input"
            value={form.attribution}
            onChange={(event) =>
              set("attribution", event.target.value as FormState["attribution"])
            }
          >
            <option value="coupon">Cupom</option>
            <option value="link">Link</option>
          </select>
        </div>
      )}
    </fieldset>
  );
}
