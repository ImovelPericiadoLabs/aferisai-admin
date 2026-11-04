import type { ComponentProps } from "react";
import type { PartnerApplication, PartnerMember, ownerPeopleApi } from "./api";
import {
  ApplicationWorkspace,
  type IntegrationTab,
} from "./ApplicationWorkspace";
import { PartnerDocumentation } from "./PartnerDocumentation";
import { PartnerMetrics } from "./PartnerMetrics";
import { PartnerPeople } from "./PartnerPeople";
import { PartnerStatement } from "./PartnerStatement";
import type { PortalSection } from "./partner-finance-model";
import type { useToast } from "./useToast";

type WorkspaceProps = ComponentProps<typeof ApplicationWorkspace>;

export function PartnerPortalSections({
  sections,
  section,
  member,
  peopleApi,
  applications,
  appRecords,
  selectedPermissions,
  selectedId,
  csrf,
  hasMoreApplications,
  loadingMoreApplications,
  tab,
  onSectionChange,
  onSelectApplication,
  onLoadMoreApplications,
  onTabChange,
  onUnauthorized,
  onToast,
}: {
  sections: { id: PortalSection; label: string }[];
  section: PortalSection | null;
  member: PartnerMember;
  peopleApi: ReturnType<typeof ownerPeopleApi> | null;
  applications: PartnerApplication[];
  appRecords: WorkspaceProps["applications"];
  selectedPermissions: WorkspaceProps["permissions"];
  selectedId: string | null;
  csrf: string;
  hasMoreApplications: boolean;
  loadingMoreApplications: boolean;
  tab: IntegrationTab;
  onSectionChange: (section: PortalSection) => void;
  onSelectApplication: (id: string | null) => void;
  onLoadMoreApplications: () => void;
  onTabChange: (tab: IntegrationTab) => void;
  onUnauthorized: () => void;
  onToast: ReturnType<typeof useToast>["show"];
}) {
  return (
    <>
      {sections.length > 1 && (
        <nav className="seg-tabs" aria-label="Seções da parceria">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`seg-tab${section === item.id ? " active" : ""}`}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => onSectionChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
      {section === "people" && peopleApi ? (
        <PartnerPeople
          api={peopleApi}
          organizationName={member.organization_name || "esta parceria"}
          canManage
          viewerId={member.id}
          onUnauthorized={onUnauthorized}
          onToast={onToast}
        />
      ) : section === "metrics" ? (
        <PartnerMetrics
          applications={applications}
          organizationName={member.organization_name || "esta parceria"}
          onUnauthorized={onUnauthorized}
        />
      ) : section === "statement" ? (
        <PartnerStatement onUnauthorized={onUnauthorized} />
      ) : section === "documentation" ? (
        <PartnerDocumentation />
      ) : section === null ? (
        <div className="empty-state" role="status">
          <strong>Seu papel não tem telas disponíveis</strong>
          <span>
            Peça a um proprietário da parceria para ajustar o seu papel.
          </span>
        </div>
      ) : (
        <ApplicationWorkspace
          applications={appRecords}
          permissions={selectedPermissions}
          selectedApplicationId={selectedId}
          onSelectApplication={onSelectApplication}
          csrfToken={csrf}
          canManage
          canEdit
          onUnauthorized={onUnauthorized}
          permissionBusy={false}
          onTogglePermission={() => {}}
          onGrantAllPermissions={() => {}}
          additionalApplication={null}
          hasMoreApplications={hasMoreApplications}
          loadingMoreApplications={loadingMoreApplications}
          onLoadMoreApplications={onLoadMoreApplications}
          channel="partner"
          selectedTab={tab}
          onTabChange={onTabChange}
          onOpenDocumentation={() => onSectionChange("documentation")}
        />
      )}
    </>
  );
}
