import { useMemo } from "react";
import {
  itemOptions,
  type FormState,
  type PolicyChannel,
} from "./commercial-model";
import { EntityPicker } from "./EntityPicker";
import {
  resolveApplication,
  resolveOrganization,
  searchApplications,
  searchOrganizations,
} from "./lookups";

export type OrganizationOption = { id: string; name: string };

type Props = {
  form: FormState;
  onChange: (next: FormState) => void;
  editing: boolean;
  busy: boolean;
  error: string;
  organizations: OrganizationOption[];
  onSubmit: () => void;
  onClose: () => void;
};

const channels: { value: PolicyChannel; title: string; hint: string }[] = [
  { value: "site", title: "Site direto", hint: "Clientes sem parceiro" },
  { value: "integration", title: "Integração", hint: "Via API de um parceiro" },
  { value: "promotion", title: "Promoção", hint: "Cupom ou link" },
];

export function CommercialPolicyForm({
  form,
  onChange,
  editing,
  busy,
  error,
  organizations,
  onSubmit,
  onClose,
}: Props) {
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

  const itemKnown = itemOptions.some(
    (option) => option.value === form.itemCode,
  );

  return (
    <>
      <div className="detail-panel-header">
        <div>
          <h2 className="rules-panel-title" id="rules-panel-title">
            {editing ? "Editar rascunho" : "Nova regra comercial"}
          </h2>
          <p className="rules-panel-sub">
            A regra só passa a valer depois de publicada. Todo registro guarda o
            motivo informado.
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-label="Fechar"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <form
        id="policy-form"
        className="detail-panel-body"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {error && (
          <div className="alert alert-danger form-alert" role="alert">
            {error}
          </div>
        )}
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
                  set(
                    "attribution",
                    event.target.value as FormState["attribution"],
                  )
                }
              >
                <option value="coupon">Cupom</option>
                <option value="link">Link</option>
              </select>
            </div>
          )}
        </fieldset>

        <fieldset className="form-section">
          <legend className="form-section-title">O que cobre</legend>
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-source">
              Entrada da consulta
            </label>
            <select
              id="policy-source"
              className="input"
              value={form.source}
              onChange={(event) =>
                set("source", event.target.value as FormState["source"])
              }
            >
              <option value="number">Número da matrícula</option>
              <option value="cnm">Código Nacional de Matrícula</option>
              <option value="address">Endereço</option>
              <option value="upload">Arquivo enviado</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-item">
              Item
            </label>
            <select
              id="policy-item"
              className="input"
              value={itemKnown ? form.itemCode : "__other__"}
              required
              onChange={(event) =>
                set(
                  "itemCode",
                  event.target.value === "__other__" ? "" : event.target.value,
                )
              }
            >
              {itemOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="__other__">Outro item do catálogo</option>
            </select>
            <span className="form-hint">
              Escolha o documento ou aplique a condição a todos os itens desta
              entrada.
            </span>
          </div>
          {!itemKnown && (
            <div className="form-field">
              <label className="form-field-label" htmlFor="policy-item-code">
                Código técnico do item
              </label>
              <input
                id="policy-item-code"
                className="input"
                value={form.itemCode}
                maxLength={80}
                required
                onChange={(event) => set("itemCode", event.target.value)}
              />
              <span className="form-hint">
                Informe o código fornecido pelo catálogo.
              </span>
            </div>
          )}
        </fieldset>

        <fieldset className="form-section">
          <legend className="form-section-title">Vigência</legend>
          <div className="form-row">
            <div className="form-field">
              <label className="form-field-label" htmlFor="policy-from">
                Início
              </label>
              <input
                id="policy-from"
                className="input"
                type="datetime-local"
                value={form.validFrom}
                required
                onChange={(event) => set("validFrom", event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-field-label" htmlFor="policy-until">
                Fim
              </label>
              <input
                id="policy-until"
                className="input"
                type="datetime-local"
                value={form.validUntil}
                required
                onChange={(event) => set("validUntil", event.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend className="form-section-title">Condições</legend>
          <div className="form-row">
            <div className="form-field">
              <label className="form-field-label" htmlFor="policy-discount-pct">
                Desconto (%)
              </label>
              <input
                id="policy-discount-pct"
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.discountPercent}
                required
                onChange={(event) => set("discountPercent", event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-field-label" htmlFor="policy-discount-brl">
                Desconto fixo (R$)
              </label>
              <input
                id="policy-discount-brl"
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.discountReais}
                required
                onChange={(event) => set("discountReais", event.target.value)}
              />
            </div>
            <div className="form-field">
              <label
                className="form-field-label"
                htmlFor="policy-commission-pct"
              >
                Comissão (%)
              </label>
              <input
                id="policy-commission-pct"
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.commissionPercent}
                required
                onChange={(event) =>
                  set("commissionPercent", event.target.value)
                }
              />
            </div>
            <div className="form-field">
              <label
                className="form-field-label"
                htmlFor="policy-commission-brl"
              >
                Comissão fixa (R$)
              </label>
              <input
                id="policy-commission-brl"
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.commissionReais}
                required
                onChange={(event) => set("commissionReais", event.target.value)}
              />
            </div>
          </div>
          <span className="form-hint">
            Percentual e valor fixo se somam. Use 0 quando não houver.
          </span>
        </fieldset>

        <fieldset className="form-section">
          <legend className="form-section-title">Justificativa</legend>
          <div className="form-field">
            <label className="form-field-label" htmlFor="policy-reason">
              Motivo
            </label>
            <textarea
              id="policy-reason"
              className="input"
              minLength={3}
              maxLength={500}
              value={form.reason}
              required
              onChange={(event) => set("reason", event.target.value)}
            />
            <span className="form-hint">
              Obrigatório. Fica registrado no histórico da regra.
            </span>
          </div>
        </fieldset>
      </form>
      <div className="detail-panel-footer">
        <button
          className="btn btn-primary btn-md"
          type="submit"
          form="policy-form"
          disabled={busy}
        >
          {editing ? "Salvar rascunho" : "Registrar rascunho"}
        </button>
        <button
          className="btn btn-ghost btn-md"
          type="button"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </>
  );
}
