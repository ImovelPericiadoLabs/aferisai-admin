import { useState } from "react";
import { OrganizationDetail } from "./OrganizationDetail";
import { PartnerDirectory } from "./PartnerDirectory";
import { PartnerOnboarding } from "./PartnerOnboarding";
import type { ToastKind } from "./useToast";

export function Organizations({
  csrf,
  canManage,
  isAdmin,
  unauthorize,
  selectedId,
  onSelect,
  onToast,
}: {
  csrf: string;
  canManage: boolean;
  isAdmin: boolean;
  unauthorize: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [creating, setCreating] = useState(false);

  if (creating && canManage)
    return (
      <PartnerOnboarding
        csrf={csrf}
        onCancel={() => setCreating(false)}
        onDone={() => setCreating(false)}
        onUnauthorized={unauthorize}
      />
    );
  if (selectedId)
    return (
      <OrganizationDetail
        key={selectedId}
        organizationId={selectedId}
        csrfToken={csrf}
        canManage={canManage}
        isAdmin={isAdmin}
        onBack={() => onSelect(null)}
        onUnauthorized={unauthorize}
        onToast={onToast}
      />
    );
  return (
    <PartnerDirectory
      onUnauthorized={unauthorize}
      onSelect={(id) => onSelect(id)}
      onCreate={canManage ? () => setCreating(true) : undefined}
    />
  );
}
