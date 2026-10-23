import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
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
  onLoadMoreApplications?: () => void;
  hasMoreApplications?: boolean;
  loadingMoreApplications?: boolean;
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
  onLoadMoreApplications,
  hasMoreApplications = false,
  loadingMoreApplications = false,
}: Props) {
  const [tabState, setTabState] = useState<Tab>("overview");
  const tabBaseId = useId().replaceAll(":", "");
  const tab = selectedTab ?? tabState;
  const activeTab =
    canManage || tab === "overview" || tab === "access" ? tab : "overview";
  const visibleTabs = canManage
    ? tabs
    : tabs.filter((item) => item.id === "overview" || item.id === "access");
  const setTab = (next: Tab) => {
    setTabState(next);
    if (next !== "access") setPermissionToReview(null);
    onTabChange?.(next);
  };
  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: Tab,
  ) => {
    const index = visibleTabs.findIndex((item) => item.id === current);
    const nextIndex =
      event.key === "ArrowRight"
        ? (index + 1) % visibleTabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + visibleTabs.length) % visibleTabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? visibleTabs.length - 1
              : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    setTab(visibleTabs[nextIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus();
  };
  const [showApplicationPicker, setShowApplicationPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [permissionToReview, setPermissionToReview] = useState<{
    code: string;
    granted: boolean;
  } | null>(null);
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
        {hasMoreApplications && onLoadMoreApplications && (
          <button
            type="button"
            className="button secondary"
            disabled={loadingMoreApplications}
            onClick={onLoadMoreApplications}
          >
            {loadingMoreApplications
              ? "Carregando…"
              : "Carregar mais aplicações"}
          </button>
        )}
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
        <p>
          {channel === "partner"
            ? "Nenhuma aplicação está disponível para sua empresa. Peça ao administrador para liberar uma integração."
            : "Crie uma aplicação para configurar credenciais e receber eventos."}
        </p>
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
            {canManage
              ? "Configure o destino dos eventos, acompanhe entregas e administre o acesso."
              : "Consulte os acessos concedidos a esta aplicação."}
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
                    setPermissionToReview(null);
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
              {hasMoreApplications && onLoadMoreApplications && (
                <button
                  type="button"
                  disabled={loadingMoreApplications}
                  onClick={onLoadMoreApplications}
                >
                  {loadingMoreApplications
                    ? "Carregando…"
                    : "Carregar mais aplicações"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div
        className="integration-tabs"
        role="tablist"
        aria-label="Configurações da aplicação"
      >
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            id={`${tabBaseId}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            aria-controls={`${tabBaseId}-panel`}
            tabIndex={activeTab === item.id ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, item.id)}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="integration-tab-select">
        <span>Área da aplicação</span>
        <select
          value={activeTab}
          onChange={(event) => setTab(event.target.value as Tab)}
        >
          {visibleTabs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <div
        id={`${tabBaseId}-panel`}
        className="integration-body"
        role="tabpanel"
        aria-labelledby={`${tabBaseId}-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "overview" && (
          <div className="integration-overview">
            <div className="integration-intro">
              <h4>Integração em um só lugar</h4>
              <p>
                {canManage
                  ? "Comece pelo endereço do webhook. Em seguida, confira as entregas e emita credenciais para seus sistemas."
                  : "Consulte as permissões concedidas a esta aplicação."}
              </p>
            </div>
            <div className="integration-action-list">
              {canManage && (
                <button type="button" onClick={() => setTab("webhooks")}>
                  <strong>Configurar webhook</strong>
                  <span>Endereço, assinatura e teste</span>
                  <b aria-hidden="true">→</b>
                </button>
              )}
              {canManage && (
                <button type="button" onClick={() => setTab("deliveries")}>
                  <strong>Ver entregas</strong>
                  <span>Eventos enviados para esta aplicação</span>
                  <b aria-hidden="true">→</b>
                </button>
              )}
              {canManage && (
                <button type="button" onClick={() => setTab("credentials")}>
                  <strong>Gerenciar credenciais</strong>
                  <span>Emitir, consultar e revogar acesso</span>
                  <b aria-hidden="true">→</b>
                </button>
              )}
              {!canManage && (
                <button type="button" onClick={() => setTab("access")}>
                  <strong>Ver permissões</strong>
                  <span>Acessos concedidos a esta aplicação</span>
                  <b aria-hidden="true">→</b>
                </button>
              )}
            </div>
          </div>
        )}
        {activeTab === "webhooks" && canManage && (
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
        {activeTab === "deliveries" && canManage && (
          <WebhookDeliveries
            key={application.id}
            applicationId={application.id}
            onUnauthorized={onUnauthorized}
            channel={channel}
          />
        )}
        {activeTab === "credentials" && canManage && (
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
        {activeTab === "access" && (
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
                              setPermissionToReview({
                                code: permission.code,
                                granted,
                              })
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
              {permissionToReview && (
                <div
                  className="integration-permission-review"
                  role="group"
                  aria-label="Revisar alteração de acesso"
                >
                  <div>
                    <strong>Revisar acesso</strong>
                    <p>
                      {permissionToReview.granted ? "Revogar" : "Conceder"}{" "}
                      <b>
                        {applicationPermissionLabel(permissionToReview.code)}
                      </b>{" "}
                      para <b>{application.name}</b>?
                    </p>
                    <small>
                      {permissionToReview.granted
                        ? "Credenciais desta aplicação perderão esta permissão imediatamente."
                        : "Credenciais desta aplicação poderão usar esta permissão após a alteração."}
                    </small>
                  </div>
                  <div className="integration-permission-review-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setPermissionToReview(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="button primary"
                      disabled={permissionBusy || !editable}
                      onClick={() => {
                        onTogglePermission(
                          application.id,
                          permissionToReview.code,
                          permissionToReview.granted,
                        );
                        setPermissionToReview(null);
                      }}
                    >
                      {permissionToReview.granted
                        ? "Confirmar revogação"
                        : "Confirmar concessão"}
                    </button>
                  </div>
                </div>
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
      {channel === "partner" && (
        <nav
          className="integration-mobile-nav"
          aria-label="Navegação da aplicação"
        >
          {(canManage
            ? (["overview", "webhooks", "deliveries", "credentials"] as Tab[])
            : (["overview"] as Tab[])
          ).map((item) => (
            <button
              key={item}
              type="button"
              aria-current={activeTab === item ? "page" : undefined}
              onClick={() => setTab(item)}
            >
              {tabs.find((tabItem) => tabItem.id === item)?.label}
            </button>
          ))}
          <button
            type="button"
            aria-current={activeTab === "access" ? "page" : undefined}
            onClick={() => setTab("access")}
          >
            {canManage ? "Mais" : "Acessos"}
          </button>
        </nav>
      )}
    </section>
  );
}
