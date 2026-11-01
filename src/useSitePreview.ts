import { useState } from "react";
import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { ApiError, beginPasskeyLogin, createSitePreviewGrant } from "./api";
import type { ToastKind } from "./useToast";
import { teamErrorMessage, type Session } from "./team-session";

/** Opens the public site preview in a new window after a passkey check. */
export function useSitePreview(
  session: Session | null,
  showToast: (message: string, kind?: ToastKind) => void,
) {
  const [sitePreviewBusy, setSitePreviewBusy] = useState(false);

  async function openSitePreview() {
    if (!session || session.member.role !== "administrator" || sitePreviewBusy)
      return;
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      showToast(
        "Permita a abertura da prévia pelo navegador e tente novamente.",
        "error",
      );
      return;
    }
    setSitePreviewBusy(true);
    try {
      const options = await beginPasskeyLogin(session.member.email);
      const credential = await startAuthentication({
        optionsJSON:
          options.public_key as unknown as PublicKeyCredentialRequestOptionsJSON,
      });
      const result = await createSitePreviewGrant(
        session.member.email,
        options.challenge_id,
        credential as unknown as Record<string, unknown>,
      );
      const origin = new URL(result.site_origin).origin;
      if (origin !== result.site_origin || !origin.startsWith("https://"))
        throw new Error("invalid preview origin");
      previewWindow.location.replace(
        `${origin}/api/acesso-equipe#${encodeURIComponent(result.grant)}`,
      );
    } catch (cause) {
      previewWindow.close();
      showToast(
        cause instanceof ApiError
          ? teamErrorMessage(cause)
          : "Não foi possível confirmar a chave de acesso.",
        "error",
      );
    } finally {
      setSitePreviewBusy(false);
    }
  }

  return { sitePreviewBusy, openSitePreview };
}
