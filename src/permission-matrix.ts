import type { OrganizationDetail } from "./api";

export type PermissionMatrix = {
  codes: { code: string; description: string }[];
  rows: {
    id: string;
    name: string;
    granted: Record<string, boolean>;
    editable: boolean;
    lockedReason: string | null;
  }[];
};

export function buildPermissionMatrix(
  detail: Pick<OrganizationDetail, "status" | "applications" | "permissions">,
): PermissionMatrix {
  const organizationActive = detail.status === "active";
  return {
    codes: detail.permissions.map(({ code, description }) => ({
      code,
      description,
    })),
    rows: detail.applications.map((application) => {
      const applicationActive = application.status === "active";
      const lockedReason = !organizationActive
        ? "A organização está suspensa."
        : !applicationActive
          ? "A aplicação está suspensa."
          : null;
      return {
        id: application.id,
        name: application.name,
        granted: Object.fromEntries(
          detail.permissions.map(({ code }) => [
            code,
            application.permissions.includes(code),
          ]),
        ),
        editable: lockedReason === null,
        lockedReason,
      };
    }),
  };
}
