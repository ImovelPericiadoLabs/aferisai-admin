import type { PartnerMember } from "./api";
import { PartnerOrganizationSwitcher } from "./PartnerOrganizationSwitcher";
import { roleLabel } from "./partner-roles";

export function PartnerPortalHeader({
  member,
  switching,
  busy,
  onSelectOrganization,
  onUnauthorized,
  onLogout,
}: {
  member: PartnerMember;
  switching: boolean;
  busy: boolean;
  onSelectOrganization: (organizationId: string) => Promise<void>;
  onUnauthorized: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="pp-topbar">
      <div className="pp-topbar-brand">
        <img src="/logo-dark.svg" alt="AferisAI" />
        <span>Integrações</span>
      </div>
      <PartnerOrganizationSwitcher
        activeId={member.organization_id}
        activeName={member.organization_name}
        activeLogoUrl={member.organization_logo_url}
        disabled={switching}
        onSelect={onSelectOrganization}
        onUnauthorized={onUnauthorized}
      />
      <div className="pp-account">
        <span className="pp-avatar" aria-hidden="true">
          {member.email.slice(0, 2).toUpperCase()}
        </span>
        <span className="pp-account-email">{member.email}</span>
        {member.role && (
          <span className="badge badge-neutral">{roleLabel(member.role)}</span>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={onLogout}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
