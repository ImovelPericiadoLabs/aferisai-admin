import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getOrganization,
  grantApplicationPermission,
  revokeApplicationPermission,
  teamPeopleApi,
  type OrganizationDetail as Detail,
} from "./api";
import { OrganizationAdmin } from "./OrganizationAdmin";
import type { ToastKind } from "./useToast";
import "./partner-detail.css";
import "./commercial-rules.css";
import { Breadcrumbs } from "./Breadcrumbs";
import { TabBar } from "./TabBar";
import { PartnerPeople } from "./PartnerPeople";
import { ApplicationCreationWizard } from "./ApplicationCreationWizard";
import { OrganizationApplicationsDirectory } from "./OrganizationApplicationsDirectory";
import { ApplicationWorkspace } from "./ApplicationWorkspace";
import { OrganizationDetailHeader } from "./OrganizationDetailHeader";
import { OrganizationLogoCard } from "./OrganizationLogoCard";
import { OrganizationPermissionCatalog } from "./OrganizationPermissionCatalog";
import { OrganizationProfileCard } from "./OrganizationProfileCard";
import { useOrganizationLogo } from "./useOrganizationLogo";
import { useOrganizationPermissions } from "./useOrganizationPermissions";
import { useOrganizationProfile } from "./useOrganizationProfile";

type Props = {
  organizationId: string;
  csrfToken: string;
  canManage: boolean;
  isAdmin: boolean;
  onBack: () => void;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
};

export function OrganizationDetail({
  organizationId,
  csrfToken,
  canManage,
  isAdmin,
  onBack,
  onUnauthorized,
  onToast,
}: Props) {
  const peopleApi = useMemo(
    () => teamPeopleApi(organizationId, csrfToken),
    [organizationId, csrfToken],
  );
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const profile = useOrganizationProfile({
    organizationId,
    csrfToken,
    canManage,
    detail,
    setDetail,
    onUnauthorized,
  });
  const permissions = useOrganizationPermissions({
    organizationId,
    csrfToken,
    setDetail,
    onUnauthorized,
    onToast,
  });
  const { permissionBusy, changePermission } = permissions;
  const [section, setSection] = useState<"application" | "partnership">(
    "application",
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let live = true;
    getOrganization(organizationId)
      .then((result) => {
        if (live) setDetail(result);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar a organização.",
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [organizationId, onUnauthorized, revision]);

  const logo = useOrganizationLogo({
    organizationId,
    csrfToken,
    detail,
    setDetail,
  });

  function retry() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  const openApplication =
    detail && section === "application" && selectedApplicationId
      ? (detail.applications.find(
          (item) => item.id === selectedApplicationId,
        ) ?? null)
      : null;

  return (
    <section className="page partner-detail" aria-labelledby="detail-title">
      <Breadcrumbs
        items={[
          { label: "Parceiros", onSelect: onBack },
          ...(detail
            ? [
                {
                  label: detail.name,
                  onSelect: openApplication
                    ? () => setSelectedApplicationId(null)
                    : undefined,
                },
                ...(openApplication ? [{ label: openApplication.name }] : []),
              ]
            : []),
        ]}
      />
      {loading && (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando parceria"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}{" "}
          <button className="btn btn-secondary btn-sm" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && detail && (
        <>
          <OrganizationDetailHeader
            detail={detail}
            logoBlobUrl={logo.logoBlobUrl}
            compact={openApplication !== null}
          />
          {!openApplication && (
            <TabBar
              label="Área da parceria"
              idBase="partner"
              panelId="partner-panel"
              active={section}
              onChange={(id) => setSection(id as "application" | "partnership")}
              tabs={[
                {
                  id: "application",
                  label: "Integrações",
                  icon: "webhook",
                  badge: {
                    tone: "neutral",
                    label: String(detail.applications.length),
                    sr: `${detail.applications.length} aplicações`,
                  },
                },
                { id: "partnership", label: "Dados da parceria", icon: "grid" },
              ]}
            />
          )}
          <div
            id="partner-panel"
            {...(openApplication
              ? {}
              : {
                  role: "tabpanel",
                  "aria-labelledby": `partner-tab-${section}`,
                })}
          >
            {section === "application" && selectedApplicationId && (
              <>
                <ApplicationWorkspace
                  key={selectedApplicationId ?? organizationId}
                  applications={detail.applications}
                  permissions={detail.permissions}
                  selectedApplicationId={selectedApplicationId}
                  onSelectApplication={setSelectedApplicationId}
                  csrfToken={csrfToken}
                  canManage={canManage}
                  canEdit={detail.status === "active"}
                  onUnauthorized={onUnauthorized}
                  permissionBusy={permissionBusy !== null}
                  onTogglePermission={(applicationId, code, granted, reason) =>
                    void changePermission(
                      () =>
                        granted
                          ? revokeApplicationPermission(
                              applicationId,
                              code,
                              csrfToken,
                              reason,
                            )
                          : grantApplicationPermission(
                              applicationId,
                              code,
                              csrfToken,
                              reason,
                            ),
                      `${applicationId}:${code}`,
                      granted ? "Permissão revogada." : "Permissão concedida.",
                    )
                  }
                  additionalApplication={null}
                  onDeleteApplication={
                    isAdmin
                      ? () => {
                          setSelectedApplicationId(null);
                          setRevision((value) => value + 1);
                          onToast(
                            "Aplicação excluída. O histórico foi mantido.",
                            "success",
                          );
                        }
                      : undefined
                  }
                />
              </>
            )}
            {section === "application" && !selectedApplicationId && (
              <OrganizationApplicationsDirectory
                organizationId={organizationId}
                organizationName={detail.name}
                applications={detail.applications}
                permissions={detail.permissions}
                canManage={canManage && detail.status === "active"}
                csrfToken={csrfToken}
                onOpen={setSelectedApplicationId}
                onChanged={() => setRevision((value) => value + 1)}
                onUnauthorized={onUnauthorized}
                createForm={
                  canManage && detail.status === "active" ? (
                    <ApplicationCreationWizard
                      key={organizationId}
                      organizationId={organizationId}
                      organizationName={detail.name}
                      availablePermissions={detail.permissions}
                      csrfToken={csrfToken}
                      onCreated={(applicationId) => {
                        setSelectedApplicationId(applicationId);
                        setRevision((value) => value + 1);
                      }}
                      onUnauthorized={onUnauthorized}
                    />
                  ) : null
                }
              />
            )}
            {section === "partnership" && (
              <div className="partner-grid">
                <div className="partner-column">
                  <OrganizationProfileCard
                    detail={detail}
                    canManage={canManage}
                    profile={profile}
                  />

                  {isAdmin && (
                    <OrganizationAdmin
                      organizationId={organizationId}
                      organizationName={detail.name}
                      status={detail.status}
                      cnpjMasked={detail.cnpj_masked}
                      csrf={csrfToken}
                      onChanged={async () =>
                        setDetail(await getOrganization(organizationId))
                      }
                      onUnauthorized={onUnauthorized}
                      onToast={onToast}
                    />
                  )}

                  <PartnerPeople
                    api={peopleApi}
                    organizationName={detail.name}
                    canManage={isAdmin}
                    onUnauthorized={onUnauthorized}
                    onToast={onToast}
                  />

                  <OrganizationLogoCard
                    hasLogo={Boolean(detail.logo_url)}
                    logoBlobUrl={logo.logoBlobUrl}
                    logoError={logo.logoError}
                    logoNotice={logo.logoNotice}
                    isAdmin={isAdmin}
                    onUpload={logo.uploadLogo}
                    onRemove={logo.removeLogo}
                    onUnauthorized={onUnauthorized}
                  />
                </div>

                <OrganizationPermissionCatalog
                  organizationId={organizationId}
                  csrfToken={csrfToken}
                  permissions={detail.permissions}
                  canManage={canManage}
                  isAdmin={isAdmin}
                  state={permissions}
                  onRegistered={async () =>
                    setDetail(await getOrganization(organizationId))
                  }
                  onUnauthorized={onUnauthorized}
                  onToast={onToast}
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
