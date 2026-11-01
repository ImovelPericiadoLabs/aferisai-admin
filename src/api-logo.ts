import { ApiError, base, request } from "./api-core";
import type { Problem } from "./api-core";

export const putOrganizationLogo = (
  organizationId: string,
  file: File,
  csrfToken: string,
) =>
  request<{ logo_url: string; width: number; height: number }>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/logo`,
    {
      method: "PUT",
      headers: { "Content-Type": file.type, "X-CSRF-Token": csrfToken },
      body: file,
    },
  );

export function uploadWithProgress<T>(
  path: string,
  file: Blob,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${base}${path}`);
    xhr.withCredentials = true;
    for (const [name, value] of Object.entries(headers))
      xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let body: unknown;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        body = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      const problem = (body ?? {}) as Problem;
      reject(
        new ApiError(
          xhr.status,
          problem.code || "REQUEST_FAILED",
          problem.detail || "Não foi possível concluir a solicitação.",
        ),
      );
    };
    xhr.onerror = () =>
      reject(
        new ApiError(0, "NETWORK_ERROR", "Falha de rede durante o envio."),
      );
    xhr.send(file);
  });
}

export const putOrganizationLogoWithProgress = (
  organizationId: string,
  file: Blob,
  csrfToken: string,
  onProgress: (fraction: number) => void,
) =>
  uploadWithProgress<{ logo_url: string; width: number; height: number }>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/logo`,
    file,
    { "Content-Type": file.type, "X-CSRF-Token": csrfToken },
    onProgress,
  );

export const deleteOrganizationLogo = (
  organizationId: string,
  csrfToken: string,
) =>
  request<void>(
    `/v1/team/organizations/${encodeURIComponent(organizationId)}/logo`,
    { method: "DELETE", headers: { "X-CSRF-Token": csrfToken } },
  );

export async function getLogoBlobUrl(relativeUrl: string): Promise<string> {
  const url = mediaUrl(relativeUrl);
  if (!url)
    throw new ApiError(
      400,
      "INVALID_MEDIA_URL",
      "Endereço de imagem inválido.",
    );
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok)
    throw new ApiError(
      response.status,
      "MEDIA_UNAVAILABLE",
      "Não foi possível carregar o logo.",
    );
  if (!response.headers.get("Content-Type")?.startsWith("image/webp"))
    throw new ApiError(
      502,
      "INVALID_MEDIA_TYPE",
      "O formato da imagem recebida é inválido.",
    );
  return URL.createObjectURL(await response.blob());
}

export function mediaUrl(relativeUrl: string | null): string | null {
  if (!relativeUrl?.startsWith("/") || relativeUrl.startsWith("//"))
    return null;
  const result = new URL(relativeUrl, base);
  return result.origin === new URL(base).origin ? result.href : null;
}
