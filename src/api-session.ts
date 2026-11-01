import { request } from "./api-core";

export type LoginBody = { email: string; password: string; otp: string };

export type SessionResult = { csrf_token: string; expires_in: number };

export type CsrfResult = { csrf_token: string };

export type PasskeyOptions = {
  challenge_id: string;
  public_key: Record<string, unknown>;
};

export type PasskeyItem = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};

export type PasskeyList = { items: PasskeyItem[] };

export type TeamMember = {
  id: string;
  email: string;
  role: "administrator" | "manager" | "viewer" | "financial";
};

export const createSession = (body: LoginBody) =>
  request<SessionResult>("/v1/team/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const beginPasskeyLogin = (email: string) =>
  request<PasskeyOptions>("/v1/team/passkeys/authentication/options", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const finishPasskeyLogin = (
  email: string,
  challengeId: string,
  credential: Record<string, unknown>,
) =>
  request<SessionResult>("/v1/team/passkeys/authentication/confirm", {
    method: "POST",
    body: JSON.stringify({ email, challenge_id: challengeId, credential }),
  });

export const listPasskeys = () =>
  request<PasskeyList>("/v1/team/passkeys", { method: "GET" });

export const beginPasskeyRegistration = (csrfToken: string) =>
  request<PasskeyOptions>("/v1/team/passkeys/registration/options", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });

export const finishPasskeyRegistration = (
  challengeId: string,
  credential: Record<string, unknown>,
  label: string,
  csrfToken: string,
) =>
  request<PasskeyItem>("/v1/team/passkeys/registration/confirm", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ challenge_id: challengeId, credential, label }),
  });

export const revokePasskey = (id: string, csrfToken: string) =>
  request<void>(`/v1/team/passkeys/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });

export const renewCsrf = () =>
  request<CsrfResult>("/v1/team/sessions/current/csrf", { method: "POST" });

export const currentMember = () =>
  request<TeamMember>("/v1/team/sessions/current", { method: "GET" });

export const deleteSession = (csrfToken: string) =>
  request<void>("/v1/team/sessions/current", {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
