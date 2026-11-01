import { useId, useState } from "react";
import { ApplicationAudit } from "./ApplicationAudit";
import { TabBar } from "./TabBar";
import { ApplicationHero } from "./ApplicationHero";
import { tabBadges } from "./application-overview-model";
import { ApplicationOverview } from "./ApplicationOverview";
import { useApplicationSnapshot } from "./useApplicationSnapshot";
import { ApplicationDeletion } from "./ApplicationDeletion";
import { ApplicationAccessTab } from "./ApplicationAccessTab";
import { ApplicationDirectory } from "./ApplicationDirectory";
import {
  ApplicationPermissionDialog,
  type PermissionReview,
} from "./ApplicationPermissionDialog";
import { ApplicationSwitcher } from "./ApplicationSwitcher";
import { CredentialManagement } from "./CredentialManagement";
import { ApplicationProfileManagement } from "./ApplicationProfileManagement";
import { WebhookEndpointManagement } from "./WebhookEndpointManagement";
import { WebhookDeliveries } from "./WebhookDeliveries";
import {
  tabIcons,
  tabs,
  type Props,
  type Tab,
} from "./application-workspace-model";
import "./application-workspace.css";
import "./integration-insights.css";

export type { IntegrationTab } from "./application-workspace-model";

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
  onDeleteApplication,
}: Props) {
  const [tabState, setTabState] = useState<Tab>("overview");
  const tabBaseId = useId().replaceAll(":", "");
  const tab = selectedTab ?? tabState;
  // The audit trail is a team-only route (manager and administrator).
  const canAudit = canManage && channel === "team";
  const visibleTabs = canManage
    ? tabs.filter(
        (item) =>
          (item.id !== "audit" || canAudit) &&
          (item.id !== "profile" || channel === "team"),
      )
    : tabs.filter((item) => item.id === "overview" || item.id === "access");
  const activeTab = visibleTabs.some((item) => item.id === tab)
    ? tab
    : "overview";
  const setTab = (next: Tab) => {
    setTabState(next);
    if (next !== "access") setPermissionToReview(null);
    onTabChange?.(next);
  };
  const [showCreate, setShowCreate] = useState(false);
  const [permissionToReview, setPermissionToReview] =
    useState<PermissionReview | null>(null);
  const application =
    applications.find((item) => item.id === selectedApplicationId) ??
    (applications.length === 1 ? applications[0] : undefined);
  const editable = canEdit && application?.status === "active";
  const {
    data: snapshot,
    failed: snapshotFailed,
    refresh: refreshSnapshot,
  } = useApplicationSnapshot(
    application?.id ?? "",
    channel,
    canManage && application !== undefined,
    onUnauthorized,
  );

  if (!application && applications.length > 1) {
    return (
      <ApplicationDirectory
        applications={applications}
        hasMoreApplications={hasMoreApplications}
        loadingMoreApplications={loadingMoreApplications}
        additionalApplication={additionalApplication}
        showCreate={showCreate}
        onOpen={(id) => {
          onSelectApplication(id);
          setTab("overview");
        }}
        onLoadMoreApplications={onLoadMoreApplications}
        onToggleCreate={() => setShowCreate((value) => !value)}
      />
    );
  }
  if (!application) {
    return (
      <section className="appws" aria-labelledby="appws-empty-title">
        <div className="empty-state" role="status">
          <strong id="appws-empty-title">Nenhuma aplicação cadastrada</strong>
          <span>
            {channel === "partner"
              ? "Nenhuma aplicação está disponível para sua empresa. Peça ao administrador para liberar uma integração."
              : "Crie uma aplicação para configurar credenciais e receber eventos."}
          </span>
        </div>
        {additionalApplication}
      </section>
    );
  }

  const grantedCount = permissions.filter((permission) =>
    application.permissions.includes(permission.code),
  ).length;

  const badges = canManage
    ? tabBadges(snapshot, grantedCount, permissions.length)
    : null;

  return (
    <section
      className={`appws${channel === "partner" ? " is-partner" : ""}`}
      aria-label={`Aplicação ${application.name}`}
    >
      <ApplicationHero
        name={application.name}
        active={application.status === "active"}
        description={
          canManage
            ? "Configure o destino dos eventos, acompanhe entregas e administre o acesso."
            : "Consulte os acessos concedidos a esta aplicação."
        }
        snapshot={snapshot}
        failed={snapshotFailed}
        grantedCount={grantedCount}
        totalPermissions={permissions.length}
        canManage={canManage}
        switcher={
          applications.length > 1 ? (
            <ApplicationSwitcher
              applications={applications}
              activeId={application.id}
              hasMoreApplications={hasMoreApplications}
              loadingMoreApplications={loadingMoreApplications}
              onLoadMoreApplications={onLoadMoreApplications}
              onSwitch={(id) => {
                onSelectApplication(id);
                setPermissionToReview(null);
                setTab("overview");
              }}
            />
          ) : null
        }
      />

      <TabBar
        label="Configurações da aplicação"
        idBase={tabBaseId}
        panelId={`${tabBaseId}-panel`}
        active={activeTab}
        onChange={(id) => setTab(id as Tab)}
        tabs={visibleTabs.map((item) => ({
          id: item.id,
          label: item.label,
          icon: tabIcons[item.id],
          badge:
            item.id === "webhooks"
              ? (badges?.webhooks ?? null)
              : item.id === "deliveries"
                ? (badges?.deliveries ?? null)
                : item.id === "credentials"
                  ? (badges?.credentials ?? null)
                  : item.id === "access"
                    ? (badges?.access ?? null)
                    : null,
        }))}
      />

      <div
        id={`${tabBaseId}-panel`}
        className="appws-body"
        role="tabpanel"
        aria-labelledby={`${tabBaseId}-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "overview" &&
          (canManage ? (
            <ApplicationOverview
              snapshot={snapshot}
              failed={snapshotFailed}
              grantedCount={grantedCount}
              totalPermissions={permissions.length}
              onOpen={setTab}
            />
          ) : (
            <div className="alert" role="note">
              Consulte as permissões concedidas a esta aplicação.{" "}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTab("access")}
              >
                Ver permissões
              </button>
            </div>
          ))}
        {activeTab === "profile" && channel === "team" && (
          <ApplicationProfileManagement
            key={application.id}
            applicationId={application.id}
            csrfToken={csrfToken}
            canEdit={editable}
            onUnauthorized={onUnauthorized}
          />
        )}
        {activeTab === "webhooks" && canManage && (
          <WebhookEndpointManagement
            key={application.id}
            applicationId={application.id}
            csrfToken={csrfToken}
            canManage={canManage}
            canEdit={editable}
            onUnauthorized={onUnauthorized}
            onChanged={refreshSnapshot}
            channel={channel}
          />
        )}
        {activeTab === "deliveries" && canManage && (
          <WebhookDeliveries
            key={application.id}
            applicationId={application.id}
            onUnauthorized={onUnauthorized}
            channel={channel}
            csrfToken={csrfToken}
            canResend={canManage && editable}
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
            onChanged={refreshSnapshot}
            channel={channel}
          />
        )}
        {activeTab === "audit" && canAudit && (
          <ApplicationAudit
            key={application.id}
            applicationId={application.id}
            onUnauthorized={onUnauthorized}
          />
        )}
        {activeTab === "access" && (
          <ApplicationAccessTab
            application={application}
            permissions={permissions}
            canManage={canManage}
            channel={channel}
            editable={editable}
            permissionBusy={permissionBusy}
            csrfToken={csrfToken}
            onUnauthorized={onUnauthorized}
            onRequestPermission={(code, granted) =>
              setPermissionToReview({ code, granted })
            }
          />
        )}
      </div>
      {canManage && applications.length > 0 && additionalApplication && (
        <div className="appws-additional">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowCreate((value) => !value)}
          >
            {showCreate ? "Fechar cadastro" : "Adicionar aplicação"}
          </button>
          {showCreate && additionalApplication}
        </div>
      )}
      {onDeleteApplication && channel === "team" && (
        <ApplicationDeletion
          key={application.id}
          applicationId={application.id}
          applicationName={application.name}
          csrfToken={csrfToken}
          onDeleted={onDeleteApplication}
          onUnauthorized={onUnauthorized}
        />
      )}
      <ApplicationPermissionDialog
        application={application}
        permissionToReview={permissionToReview}
        busy={permissionBusy}
        onConfirm={(reason) => {
          if (!permissionToReview) return;
          onTogglePermission(
            application.id,
            permissionToReview.code,
            permissionToReview.granted,
            reason,
          );
          setPermissionToReview(null);
        }}
        onCancel={() => setPermissionToReview(null)}
      />
    </section>
  );
}
