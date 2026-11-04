import { Access } from "./Access";
import { Analyses } from "./Analyses";
import { AnalysisProviders } from "./AnalysisProviders";
import { Commissions } from "./Commissions";
import { CommercialPolicies } from "./CommercialPolicies";
import { Connections } from "./Connections";
import { DashboardOverview } from "./DashboardOverview";
import { DesignSystemGuide } from "./DesignSystemGuide";
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import { FinancialExceptions } from "./FinancialExceptions";
import { IntegrationMap } from "./IntegrationMap";
import { OnrPreviewReview } from "./OnrPreviewReview";
import { OperationsDashboard } from "./OperationsDashboard";
import { OrdersHub } from "./OrdersHub";
import { Organizations } from "./Organizations";
import { Passkeys } from "./Passkeys";
import type { PeopleTab } from "./people-model";
import { Promotions } from "./Promotions";
import { RegistryReconciliation } from "./RegistryReconciliation";
import { RegistryRequestDirectory } from "./RegistryRequestDirectory";
import { RegistrySuppliers } from "./RegistrySuppliers";
import { ReportsHub } from "./ReportsHub";
import { RequestDirectory } from "./RequestDirectory";
import { SiteMaintenance } from "./SiteMaintenance";
import { SourceClassification } from "./SourceClassification";
import { TaskInbox } from "./TaskInbox";
import { TeamMembers } from "./TeamMembers";
import { Users } from "./Users";
import type { ToastKind } from "./useToast";
import type { HiddenPage, Page } from "./team-nav-model";
import type { Session } from "./team-session";

type Props = {
  currentPage: Page | HiddenPage;
  session: Session;
  canReview: boolean;
  unauthorize: () => void;
  navigate: (page: Page) => void;
  showToast: (message: string, kind?: ToastKind) => void;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (id: string | null) => void;
  selectedRequestId: string;
  setSelectedRequestId: (id: string) => void;
  selectedWorkId: string;
  setSelectedWorkId: (id: string) => void;
  selectedCaseId: string;
  setSelectedCaseId: (id: string) => void;
};

/** Maps the resolved team page to its screen, wiring session and shell state. */
export function TeamPageContent({
  currentPage,
  session,
  canReview,
  unauthorize,
  navigate,
  showToast,
  selectedOrganizationId,
  setSelectedOrganizationId,
  selectedRequestId,
  setSelectedRequestId,
  selectedWorkId,
  setSelectedWorkId,
  selectedCaseId,
  setSelectedCaseId,
}: Props) {
  const peopleTabs: PeopleTab[] = [
    ...(canReview ? [{ page: "users" as const, label: "Usuários" }] : []),
    ...(session.member.role === "administrator"
      ? [{ page: "team-members" as const, label: "Equipe" }]
      : []),
  ];
  return currentPage === "overview" ? (
    <DashboardOverview role={session.member.role} navigate={navigate} />
  ) : currentPage === "executive" && session.member.role === "administrator" ? (
    <ExecutiveDashboard onUnauthorized={unauthorize} navigate={navigate} />
  ) : currentPage === "reports" ? (
    <ReportsHub
      role={session.member.role}
      navigate={navigate}
      onUnauthorized={unauthorize}
    />
  ) : currentPage === "organizations" ? (
    <Organizations
      csrf={session.csrf}
      canManage={
        session.member.role === "administrator" ||
        session.member.role === "manager"
      }
      isAdmin={session.member.role === "administrator"}
      unauthorize={unauthorize}
      selectedId={selectedOrganizationId}
      onSelect={setSelectedOrganizationId}
      onToast={showToast}
    />
  ) : currentPage === "commercial" &&
    session.member.role === "administrator" ? (
    <CommercialPolicies csrf={session.csrf} onUnauthorized={unauthorize} />
  ) : currentPage === "promotions" &&
    session.member.role === "administrator" ? (
    <Promotions csrf={session.csrf} onUnauthorized={unauthorize} />
  ) : currentPage === "tasks" ? (
    <TaskInbox
      role={session.member.role}
      memberId={session.member.id}
      onUnauthorized={unauthorize}
      onOpen={(page, id) => {
        if (page === "sources" && id) setSelectedRequestId(id);
        if (page === "analyses" && id) setSelectedWorkId(id);
        if (page === "financial") setSelectedCaseId(id ?? "");
        navigate(page);
      }}
    />
  ) : currentPage === "orders" && canReview ? (
    <OrdersHub
      canRead={canReview}
      onUnauthorized={unauthorize}
      openSource={(requestId) => {
        setSelectedRequestId(requestId);
        navigate("sources");
      }}
      openReview={(workId) => {
        setSelectedWorkId(workId);
        navigate("analyses");
      }}
    />
  ) : currentPage === "requests" ? (
    <RequestDirectory
      canRead={canReview}
      onUnauthorized={unauthorize}
      openSource={(requestId) => {
        setSelectedRequestId(requestId);
        navigate("sources");
      }}
      openReview={(workId) => {
        setSelectedWorkId(workId);
        navigate("analyses");
      }}
    />
  ) : currentPage === "sources" ? (
    <SourceClassification
      csrf={session.csrf}
      canClassify={canReview}
      onUnauthorized={unauthorize}
      initialRequestId={selectedRequestId}
    />
  ) : currentPage === "analyses" ? (
    <Analyses
      csrf={session.csrf}
      canReview={canReview}
      isAdmin={session.member.role === "administrator"}
      onUnauthorized={unauthorize}
      initialWorkId={selectedWorkId}
      openSource={(requestId) => {
        setSelectedRequestId(requestId);
        navigate("sources");
      }}
    />
  ) : currentPage === "financial" ? (
    <FinancialExceptions
      csrf={session.csrf}
      memberId={session.member.id}
      role={session.member.role}
      onUnauthorized={unauthorize}
      initialCaseId={selectedCaseId}
      nav={{
        openPage: navigate,
        openSource: (requestId) => {
          setSelectedRequestId(requestId);
          navigate("sources");
        },
        openAnalysis: (workId) => {
          setSelectedWorkId(workId);
          navigate("analyses");
        },
      }}
    />
  ) : currentPage === "commissions" ? (
    <Commissions csrf={session.csrf} onUnauthorized={unauthorize} />
  ) : currentPage === "reconciliation" && canReview ? (
    <RegistryReconciliation
      csrf={session.csrf}
      isAdmin={session.member.role === "administrator"}
      onUnauthorized={unauthorize}
      onToast={showToast}
    />
  ) : currentPage === "onr-review" && canReview ? (
    <OnrPreviewReview
      csrf={session.csrf}
      onUnauthorized={unauthorize}
      onToast={showToast}
    />
  ) : currentPage === "registry-requests" && canReview ? (
    <RegistryRequestDirectory onUnauthorized={unauthorize} />
  ) : currentPage === "connections" && canReview ? (
    <Connections
      canRead={canReview}
      canRevoke={canReview}
      csrf={session.csrf}
      onUnauthorized={unauthorize}
      onToast={showToast}
    />
  ) : currentPage === "users" && canReview ? (
    <Users
      canRead={canReview}
      isAdmin={session.member.role === "administrator"}
      csrf={session.csrf}
      actorId={session.member.id}
      tabs={peopleTabs}
      onTab={navigate}
      onUnauthorized={unauthorize}
      onToast={showToast}
    />
  ) : currentPage === "team-members" &&
    session.member.role === "administrator" ? (
    <TeamMembers
      isAdmin={session.member.role === "administrator"}
      csrf={session.csrf}
      actorId={session.member.id}
      tabs={peopleTabs}
      onTab={navigate}
      onUnauthorized={unauthorize}
      onToast={showToast}
    />
  ) : currentPage === "analysis-providers" &&
    session.member.role === "administrator" ? (
    <AnalysisProviders csrf={session.csrf} onUnauthorized={unauthorize} />
  ) : currentPage === "operations" &&
    session.member.role === "administrator" ? (
    <OperationsDashboard onUnauthorized={unauthorize} />
  ) : currentPage === "registry-suppliers" &&
    session.member.role === "administrator" ? (
    <RegistrySuppliers
      csrf={session.csrf}
      onUnauthorized={unauthorize}
      onToast={showToast}
    />
  ) : currentPage === "design-system" ? (
    <DesignSystemGuide />
  ) : currentPage === "integration-map" ? (
    <IntegrationMap />
  ) : currentPage === "passkeys" ? (
    <Passkeys csrf={session.csrf} onUnauthorized={unauthorize} />
  ) : currentPage === "maintenance" &&
    session.member.role === "administrator" ? (
    <SiteMaintenance
      csrf={session.csrf}
      onUnauthorized={unauthorize}
      onToast={showToast}
    />
  ) : (
    <Access
      role={session.member.role}
      csrf={session.csrf}
      onUnauthorized={unauthorize}
    />
  );
}
