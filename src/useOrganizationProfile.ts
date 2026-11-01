import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  ApiError,
  replaceOrganizationProfile,
  type OrganizationDetail as Detail,
} from "./api";

export function useOrganizationProfile({
  organizationId,
  csrfToken,
  canManage,
  detail,
  setDetail,
  onUnauthorized,
}: {
  organizationId: string;
  csrfToken: string;
  canManage: boolean;
  detail: Detail | null;
  setDetail: Dispatch<SetStateAction<Detail | null>>;
  onUnauthorized: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [identifierNotice, setIdentifierNotice] = useState("");

  function startEditing() {
    if (!detail || !canManage) return;
    setName(detail.name);
    setDescription(detail.description || "");
    setSaveError("");
    setSaved(false);
    setEditing(true);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !canManage) return;
    setSaving(true);
    setSaveError("");
    try {
      const updated = await replaceOrganizationProfile(
        organizationId,
        { name: name.trim(), description: description.trim() || null },
        csrfToken,
      );
      setDetail({ ...detail, ...updated });
      setEditing(false);
      setSaved(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setSaveError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível salvar o perfil.",
        );
    } finally {
      setSaving(false);
    }
  }

  async function copyIdentifier() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.id);
      setIdentifierNotice("Identificador copiado.");
    } catch {
      setIdentifierNotice("Selecione o identificador para copiar.");
    }
  }

  return {
    editing,
    setEditing,
    name,
    setName,
    description,
    setDescription,
    saving,
    saveError,
    saved,
    identifierNotice,
    startEditing,
    saveProfile,
    copyIdentifier,
  };
}

export type OrganizationProfileState = ReturnType<
  typeof useOrganizationProfile
>;
