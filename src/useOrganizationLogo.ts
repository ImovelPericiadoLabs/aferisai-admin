import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  deleteOrganizationLogo,
  getLogoBlobUrl,
  getOrganization,
  mediaUrl,
  putOrganizationLogoWithProgress,
  type OrganizationDetail as Detail,
} from "./api";
import { organizationLogos } from "./organization-logos";

export function useOrganizationLogo({
  organizationId,
  csrfToken,
  detail,
  setDetail,
}: {
  organizationId: string;
  csrfToken: string;
  detail: Detail | null;
  setDetail: Dispatch<SetStateAction<Detail | null>>;
}) {
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null);
  const [logoRevision, setLogoRevision] = useState(0);
  const [logoError, setLogoError] = useState("");
  const [logoNotice, setLogoNotice] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (detail?.logo_url && mediaUrl(detail.logo_url)) {
      getLogoBlobUrl(detail.logo_url)
        .then((url) => {
          objectUrl = url;
          if (active) setLogoBlobUrl(url);
          else URL.revokeObjectURL(url);
        })
        .catch(() => {
          if (active) setLogoError("Não foi possível carregar o logo.");
        });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [detail?.logo_url, logoRevision]);

  async function refreshLogo(notice: string) {
    organizationLogos.invalidate(organizationId);
    try {
      const next = await getOrganization(organizationId);
      setLogoBlobUrl(null);
      setDetail(next);
      setLogoRevision((value) => value + 1);
      setLogoError("");
      setLogoNotice(notice);
    } catch {
      setLogoNotice("");
      setLogoError(
        "A alteração foi salva, mas não foi possível atualizar a tela. Recarregue a página para ver o resultado.",
      );
    }
  }

  async function uploadLogo(
    file: Blob,
    onProgress: (fraction: number) => void,
  ) {
    setLogoNotice("");
    await putOrganizationLogoWithProgress(
      organizationId,
      file,
      csrfToken,
      onProgress,
    );
    await refreshLogo("Logo atualizado.");
  }

  async function removeLogo() {
    setLogoNotice("");
    await deleteOrganizationLogo(organizationId, csrfToken);
    await refreshLogo("Logo removido.");
  }

  return { logoBlobUrl, logoError, logoNotice, uploadLogo, removeLogo };
}
