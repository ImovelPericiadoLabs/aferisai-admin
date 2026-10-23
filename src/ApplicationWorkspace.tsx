import { useState, type ReactNode } from "react";
import { CredentialManagement } from "./CredentialManagement";
import { RedirectUriManagement } from "./RedirectUriManagement";
import { WebhookEndpointManagement } from "./WebhookEndpointManagement";
import { WebhookDeliveries } from "./WebhookDeliveries";
import {
  applicationPermissionDescription,
  applicationPermissionGlyph,
  applicationPermissionLabel,
} from "./display-labels";
import "./integration-workspace.css";

type Application = {
  id: string;
  name: string;
  status: string;
  permissions: string[];
};
type Permission = { code: string; description: string };
export type IntegrationTab =
  "overview" | "webhooks" | "deliveries" | "credentials" | "access";
type Tab = IntegrationTab;

type Props = {
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
  ) => void;
  channel?: "team" | "partner";
  selectedTab?: IntegrationTab;
  onTabChange?: (tab: IntegrationTab) => void;
  additionalApplication: ReactNode;
};

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "webhooks", label: "Webhooks" },
  { id: "deliveries", label: "Entregas" },
  { id: "credentials", label: "Credenciais" },
  { id: "access", label: "Acessos" },
];

export function ApplicationWorkspace({
  applications,
  permissions,
  selectedApplicationId,
  onSelectApplication,
  csrfToken,
  canManage,
  canEdit,
  onUnauthorized,
  permissionBusy,
  onTogglePermission,
  channel = "team",
  selectedTab,
  onTabChange,
  additionalApplication,
}: Props) {
  const [tabState, setTabState] = useState<Tab>("overview");
  const tab = selectedTab ?? tabState;
  const setTab = (next: Tab) => {
    setTabState(next);
    onTabChange?.(next);
  };
  const [showApplicationPicker, setShowApplicationPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const application =
    applications.find((item) => item.id === selectedApplicationId) ??
    (applications.length === 1 ? applications[0] : undefined);
  const editable = canEdit && application?.status === "active";

  if (!application && applications.length > 1) {
    return (
      <section
        className="integration-directory"
        aria-labelledby="integration-directory-title"
      >
        <div className="integration-heading">
          <div>
            <p className="integration-kicker">Parceria</p>
            <h3 id="integration-directory-title">Aplicações</h3>
            <p>Escolha a integração que deseja consultar ou configurar.</p>
          </div>
        </div>
        <div className="integration-action-list">
          {applications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectApplication(item.id);
                setTab("overview");
              }}
            >
              <strong>{item.name}</strong>
              <span>{item.status === "active" ? "Ativa" : "Suspensa"}</span>
              <b aria-hidden="true">→</b>
            </button>
          ))}
        </div>
        {additionalApplication && (
          <div className="integration-additional">
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowCreate((value) => !value)}
            >
              {showCreate ? "Fechar cadastro" : "Nova aplicação"}
            </button>
            {showCreate && additionalApplication}
          </div>
        )}
      </section>
    );
  }
  if (!application) {
    return (
      <section
        className="integration-empty"
        aria-labelledby="integration-empty-title"
      >
        <h3 id="integration-empty-title">Nenhuma aplicação cadastrada</h3>
        <p>Crie uma aplicação para configurar credenciais e receber eventos.</p>
        {additionalApplication}
      </section>
    );
  }

  return (
    <section
      className={`integration-workspace ${channel === "partner" ? "is-partner" : ""}`}
      aria-label={`Aplicação ${application.name}`}
    >
      <div className="integration-heading">
        <div>
          <p className="integration-kicker">Aplicação</p>
          <h3>{application.name}</h3>
          <p>
            Configure o destino dos eventos, acompanhe entregas e administre o
            acesso.
          </p>
        </div>
        <span
          className={`integration-status ${application.status === "active" ? "is-active" : "is-paused"}`}
        >
          <span aria-hidden="true">
            {application.status === "active" ? "✓" : "Ⅱ"}
          </span>
          {application.status === "active" ? "Ativa" : "Suspensa"}
        </span>
      </div>

      {applications.length > 1 && (
        <div className="integration-picker">
          <button
            className="button secondary"
            type="button"
            aria-expanded={showApplicationPicker}
            onClick={() => setShowApplicationPicker((value) => !value)}
          >
            Trocar aplicação <span aria-hidden="true">⌄</span>
          </button>
          {showApplicationPicker && (
            <div
              className="integration-picker-list"
              role="group"
              aria-label="Aplicações da parceria"
            >
              {applications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={item.id === application.id ? "true" : undefined}
                  onClick={() => {
                    onSelectApplication(item.id);
                    setTab("overview");
                    setShowApplicationPicker(false);
                  }}
                >
                  {item.name}
                  <small>
                    {item.status === "active" ? "Ativa" : "Suspensa"}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className="integration-tabs"
        role="tablist"
        aria-label="Configurações da aplicação"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="integration-body" role="tabpanel">
        {tab === "overview" && (
          <div className="integration-overview">
            <div className="integration-intro">
              <h4>Integração em um só lugar</h4>
              <p>
                Comece pelo endereço do webhook. Em seguida, confira as entregas
                e emita credenciais para seus sistemas.
              </p>
            </div>
            <div className="integration-action-list">
              <button type="button" onClick={() => setTab("webhooks")}>
                <strong>Configurar webhook</strong>
                <span>Endereço, assinatura e teste</span>
                <b aria-hidden="true">→</b>
              </button>
              <button type="button" onClick={() => setTab("deliveries")}>
                <strong>Ver entregas</strong>
                <span>Eventos enviados para esta aplicação</span>
                <b aria-hidden="true">→</b>
              </button>
              <button type="button" onClick={() => setTab("credentials")}>
                <strong>Gerenciar credenciais</strong>
                <span>Emitir, consultar e revogar acesso</span>
                <b aria-hidden="true">→</b>
              </button>
            </div>
          </div>
        )}
        {tab === "webhooks" && canManage && (
          <WebhookEndpointManagement
            key={application.id}
            applicationId={application.id}
            csrfToken={csrfToken}
            canManage={canManage}
            canEdit={editable}
            onUnauthorized={onUnauthorized}
            channel={channel}
          />
        )}
        {tab === "deliveries" && (
          <WebhookDeliveries
            key={application.id}
            applicationId={application.id}
            onUnauthorized={onUnauthorized}
            channel={channel}
          />
        )}
        {tab === "credentials" && canManage && (
          <CredentialManagement
            key={application.id}
            applicationId={application.id}
            csrfToken={csrfToken}
            canIssue={editable}
            availableScopes={application.permissions}
            permissionDescriptions={Object.fromEntries(
              permissions.map((permission) => [
                permission.code,
                permission.description,
              ]),
            )}
            onUnauthorized={onUnauthorized}
            channel={channel}
          />
        )}
        {tab === "access" && (
          <div className="integration-access">
            <section>
              <h4>Permissões da aplicação</h4>
              {permissions.length ? (
                <ul className="integration-permissions">
                  {permissions.map((permission, index) => {
                    const granted = application.permissions.includes(
                      permission.code,
                    );
                    return (
                      <li key={permission.code}>
                        <span
                          className="integration-permission-icon"
                          aria-hidden="true"
                        >
                          {applicationPermissionGlyph(permission.code, index)}
                        </span>
                        <strong title={permission.code}>
                          {applicationPermissionLabel(permission.code)}
                        </strong>
                        <small>
                          {applicationPermissionDescription(
                            permission.code,
                            permission.description,
                          )}
                        </small>
                        <span
                          className={`integration-permission-state ${granted ? "is-granted" : ""}`}
                        >
                          {granted ? "Concedida" : "Não concedida"}
                        </span>
                        {canManage && channel === "team" && (
                          <button
                            type="button"
                            className="back-link"
                            disabled={permissionBusy || !editable}
                            onClick={() =>
                              onTogglePermission(
                                application.id,
                                permission.code,
                                granted,
                              )
                            }
                          >
                            {granted ? "Revogar" : "Conceder"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>Nenhuma permissão disponível.</p>
              )}
            </section>
            {canManage && channel === "team" && (
              <section>
                <h4>Autorização OAuth</h4>
                <RedirectUriManagement
                  applicationId={application.id}
                  csrfToken={csrfToken}
                  canEdit={editable}
                  onUnauthorized={onUnauthorized}
                />
              </section>
            )}
          </div>
        )}
      </div>
      {canManage && applications.length > 0 && additionalApplication && (
        <div className="integration-additional">
          <button
            type="button"
            className="back-link"
            onClick={() => setShowCreate((value) => !value)}
          >
            {showCreate ? "Fechar cadastro" : "Adicionar aplicação"}
          </button>
          {showCreate && additionalApplication}
        </div>
      )}
      <nav
        className="integration-mobile-nav"
        aria-label="Navegação da aplicação"
      >
        {(["overview", "webhooks", "deliveries", "credentials"] as Tab[]).map(
          (item) => (
            <button
              key={item}
              type="button"
              aria-current={tab === item ? "page" : undefined}
              onClick={() => setTab(item)}
            >
              {tabs.find((tabItem) => tabItem.id === item)?.label}
            </button>
          ),
        )}
        <button
          type="button"
          aria-current={tab === "access" ? "page" : undefined}
          onClick={() => setTab("access")}
        >
          Mais
        </button>
      </nav>
    </section>
  );
}
