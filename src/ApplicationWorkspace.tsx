import { useId, useState, type ReactNode } from "react";
import { AccessMatrix } from "./AccessMatrix";
import { TabBar } from "./TabBar";
import { ApplicationHero } from "./ApplicationHero";
import { tabBadges } from "./application-overview-model";
import { ApplicationOverview } from "./ApplicationOverview";
import { useApplicationSnapshot } from "./useApplicationSnapshot";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldAction } from "./FieldAction";
import { CredentialManagement } from "./CredentialManagement";
import { RedirectUriManagement } from "./RedirectUriManagement";
import { WebhookEndpointManagement } from "./WebhookEndpointManagement";
import { WebhookDeliveries } from "./WebhookDeliveries";
import { applicationPermissionLabel } from "./display-labels";
import "./application-workspace.css";
import "./integration-insights.css";

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

const tabIcons: Record<Tab, string> = {
  overview: "grid",
  webhooks: "webhook",
  deliveries: "activity",
  credentials: "key",
  access: "shield",
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
  const [showCreate, setShowCreate] = useState(false);
  const [permissionToReview, setPermissionToReview] = useState<{
    code: string;
    granted: boolean;
  } | null>(null);
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
      <section className="appws" aria-labelledby="appws-directory-title">
        <header className="appws-head">
          <div>
            <h2 className="appws-title" id="appws-directory-title">
              Aplicações
            </h2>
            <p className="page-subtitle">
              Escolha a integração que deseja consultar ou configurar.
            </p>
          </div>
        </header>
        <div className="data-table-wrap">
          <table className="data-table" aria-label="Aplicações">
            <thead>
              <tr>
                <th scope="col">Aplicação</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.map((item) => (
                <tr key={item.id}>
                  <td data-label="Aplicação">
                    <button
                      type="button"
                      className="rules-cell-button"
                      onClick={() => {
                        onSelectApplication(item.id);
                        setTab("overview");
                      }}
                    >
                      <strong>{item.name}</strong>
                    </button>
                  </td>
                  <td data-label="Estado">
                    <span
                      className={`badge ${item.status === "active" ? "badge-success" : "badge-warning"}`}
                    >
                      {item.status === "active" ? "Ativa" : "Suspensa"}
                    </span>
                  </td>
                  <td className="appws-open">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onSelectApplication(item.id);
                        setTab("overview");
                      }}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMoreApplications && onLoadMoreApplications && (
          <button
            type="button"
            className="btn btn-secondary btn-md appws-more"
            disabled={loadingMoreApplications}
            onClick={onLoadMoreApplications}
          >
            {loadingMoreApplications
              ? "Carregando…"
              : "Carregar mais aplicações"}
          </button>
        )}
        {additionalApplication && (
          <div className="appws-additional">
            <button
              type="button"
              className="btn btn-secondary btn-md"
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
            <div className="appws-switch">
              <FieldAction
                id="appws-switch-select"
                label="Trocar aplicação"
                action={
                  hasMoreApplications && onLoadMoreApplications ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-md"
                      disabled={loadingMoreApplications}
                      onClick={onLoadMoreApplications}
                    >
                      {loadingMoreApplications
                        ? "Carregando…"
                        : "Carregar mais aplicações"}
                    </button>
                  ) : null
                }
              >
                <select
                  id="appws-switch-select"
                  className="input"
                  value={application.id}
                  onChange={(event) => {
                    onSelectApplication(event.target.value);
                    setPermissionToReview(null);
                    setTab("overview");
                  }}
                >
                  {applications.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ·{" "}
                      {item.status === "active" ? "Ativa" : "Suspensa"}
                    </option>
                  ))}
                </select>
              </FieldAction>
            </div>
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
            item.id === "overview"
              ? null
              : (badges?.[
                  item.id === "webhooks"
                    ? "webhooks"
                    : item.id === "deliveries"
                      ? "deliveries"
                      : item.id === "credentials"
                        ? "credentials"
                        : "access"
                ] ?? null),
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
        {activeTab === "access" && (
          <div className="appws-access">
            <section aria-labelledby="appws-permissions-title">
              <h3 className="appws-section-title" id="appws-permissions-title">
                Permissões da aplicação
              </h3>
              <AccessMatrix
                permissions={permissions}
                granted={application.permissions}
                canChange={canManage && channel === "team" && editable}
                busy={permissionBusy}
                readOnlyHint={
                  channel === "partner"
                    ? "Somente leitura: a equipe da Aferis gerencia estes acessos."
                    : "Somente leitura: seu perfil não pode alterar estes acessos, ou a aplicação está suspensa."
                }
                onRequest={(code, granted) =>
                  setPermissionToReview({ code, granted })
                }
              />
            </section>
            {canManage && channel === "team" && (
              <section aria-labelledby="appws-oauth-title">
                <h3 className="appws-section-title" id="appws-oauth-title">
                  Autorização OAuth
                </h3>
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
      <ConfirmDialog
        open={permissionToReview !== null}
        tone={permissionToReview?.granted ? "danger" : "primary"}
        title={
          permissionToReview?.granted
            ? "Revogar esta permissão?"
            : "Conceder esta permissão?"
        }
        description={
          permissionToReview?.granted
            ? "As credenciais desta aplicação perdem a permissão imediatamente."
            : "As credenciais desta aplicação poderão usar a permissão após a alteração."
        }
        details={
          permissionToReview
            ? [
                { label: "Aplicação", value: application.name },
                {
                  label: "Permissão",
                  value: applicationPermissionLabel(permissionToReview.code),
                },
              ]
            : []
        }
        confirmLabel={
          permissionToReview?.granted
            ? "Confirmar revogação"
            : "Confirmar concessão"
        }
        busy={permissionBusy}
        onConfirm={() => {
          if (!permissionToReview) return;
          onTogglePermission(
            application.id,
            permissionToReview.code,
            permissionToReview.granted,
          );
          setPermissionToReview(null);
        }}
        onCancel={() => setPermissionToReview(null)}
      />
    </section>
  );
}
