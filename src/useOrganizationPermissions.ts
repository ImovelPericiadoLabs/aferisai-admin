import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  ApiError,
  describeOrganizationPermission,
  getOrganization,
  type OrganizationDetail as Detail,
} from "./api";
import type { ToastKind } from "./useToast";

export function useOrganizationPermissions({
  organizationId,
  csrfToken,
  setDetail,
  onUnauthorized,
  onToast,
}: {
  organizationId: string;
  csrfToken: string;
  setDetail: Dispatch<SetStateAction<Detail | null>>;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const [permissionEditing, setPermissionEditing] = useState<string | null>(
    null,
  );
  const [permissionDescription, setPermissionDescription] = useState("");
  const [permissionBusy, setPermissionBusy] = useState<string | null>(null);

  async function changePermission(
    action: () => Promise<unknown>,
    key: string,
    notice: string,
  ) {
    setPermissionBusy(key);
    try {
      await action();
      setDetail(await getOrganization(organizationId));
      setPermissionEditing(null);
      onToast(notice, "success");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        onToast(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível atualizar a permissão.",
          "error",
        );
    } finally {
      setPermissionBusy(null);
    }
  }

  function savePermissionDescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissionEditing || !permissionDescription.trim()) return;
    void changePermission(
      () =>
        describeOrganizationPermission(
          organizationId,
          permissionEditing,
          permissionDescription.trim(),
          csrfToken,
        ),
      `description:${permissionEditing}`,
      "Descrição atualizada.",
    );
  }

  return {
    permissionEditing,
    setPermissionEditing,
    permissionDescription,
    setPermissionDescription,
    permissionBusy,
    changePermission,
    savePermissionDescription,
  };
}

export type OrganizationPermissionsState = ReturnType<
  typeof useOrganizationPermissions
>;
