import { useEffect, useState } from "react";
import { getOrganization } from "./api";
import {
  itemOptions,
  type FormState,
  type PolicyChannel,
} from "./commercial-model";

export type OrganizationOption = { id: string; name: string };

type Props = {
  form: FormState;
  onChange: (next: FormState) => void;
  editing: boolean;
  busy: boolean;
  organizations: OrganizationOption[];
  onSubmit: () => void;
  onClose: () => void;
};

type ApplicationsState = {
  organizationId: string;
  applications: { id: string; name: string }[] | null;
};

const channels: { value: PolicyChannel; title: string; hint: string }[] = [
  { value: "site", title: "Site direto", hint: "Clientes sem parceiro" },
  { value: "integration", title: "Integração", hint: "Via API de um parceiro" },
  { value: "promotion", title: "Promoção", hint: "Cupom ou link" },
];

const MANUAL = "__manual__";

export function CommercialPolicyForm({
  form,
  onChange,
  editing,
  busy,
  organizations,
  onSubmit,
  onClose,
}: Props) {
  const [manualOrg, setManualOrg] = useState(
    () =>
      Boolean(form.organizationId) &&
      !organizations.some((org) => org.id === form.organizationId),
  );
  const [manualApp, setManualApp] = useState(false);
  const [appsState, setAppsState] = useState<ApplicationsState | null>(null);

  const needsOrganization = form.channel !== "site";
  const needsApplication = form.channel === "integration";
  const organizationId = form.organizationId.trim();

  useEffect(() => {
    if (!needsApplication || !organizationId) return;
    let live = true;
    getOrganization(organizationId)
      .then((detail) => {
        if (live)
          setAppsState({
            organizationId,
            applications: detail.applications.map((app) => ({
              id: app.id,
              name: app.name,
            })),
          });
      })
      .catch(() => {
        if (live) setAppsState({ organizationId, applications: null });
      });
    return () => {
      live = false;
    };
  }, [needsApplication, organizationId]);

  const applications =
    appsState?.organizationId === organizationId
      ? appsState.applications
      : null;
  const appsLoading =
    needsApplication &&
    Boolean(organizationId) &&
    appsState?.organizationId !== organizationId;
  const showManualOrg = manualOrg || organizations.length === 0;
  const showManualApp =
    manualApp ||
    (Boolean(organizationId) &&
      !appsLoading &&
      (applications === null ||
        (Boolean(form.applicationId) &&
          !applications.some((app) => app.id === form.applicationId))));

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
            <div className="form-field">
              <label className="form-field-label" htmlFor="policy-organization">
                Organização
              </label>
              {showManualOrg ? (
                <input
                  id="policy-organization"
                  className="input"
                  value={form.organizationId}
                  placeholder="UUID da organização"
                  onChange={(event) =>
                    set("organizationId", event.target.value)
                  }
                  required
                />
              ) : (
                <select
                  id="policy-organization"
                  className="input"
                  value={form.organizationId}
                  required
                  onChange={(event) => {
                    if (event.target.value === MANUAL) {
                      setManualOrg(true);
                      set("organizationId", "");
                    } else {
                      onChange({
                        ...form,
                        organizationId: event.target.value,
                        applicationId: "",
                      });
                    }
                  }}
                >
                  <option value="">Selecione uma organização</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                  <option value={MANUAL}>Outra (informar UUID)</option>
                </select>
              )}
            </div>
          )}
          {needsApplication && (
            <div className="form-field">
              <label className="form-field-label" htmlFor="policy-application">
                Aplicação
              </label>
              {showManualApp ? (
                <input
                  id="policy-application"
                  className="input"
                  value={form.applicationId}
                  placeholder="UUID da aplicação"
                  onChange={(event) => set("applicationId", event.target.value)}
                  required
                />
              ) : (
                <select
                  id="policy-application"
                  className="input"
                  value={form.applicationId}
                  required
                  disabled={appsLoading || !organizationId}
                  onChange={(event) => {
                    if (event.target.value === MANUAL) {
                      setManualApp(true);
                      set("applicationId", "");
                    } else set("applicationId", event.target.value);
                  }}
                >
                  <option value="">
                    {!organizationId
                      ? "Escolha a organização primeiro"
                      : appsLoading
                        ? "Carregando aplicações…"
                        : "Selecione uma aplicação"}
                  </option>
                  {(applications ?? []).map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
                  <option value={MANUAL}>Outra (informar UUID)</option>
                </select>
              )}
            </div>
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
