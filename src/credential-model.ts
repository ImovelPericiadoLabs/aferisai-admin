import type { PartnerCredential } from "./api";
import { relativeTime } from "./integration-insights-model";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const EXPIRING_WINDOW = 14 * DAY;

export type CredentialState = {
  key: "active" | "expiring" | "expired" | "revoked";
  label: string;
  tone: "success" | "warning" | "neutral";
};

export function credentialState(
  credential: PartnerCredential,
  now: number = Date.now(),
): CredentialState {
  if (credential.status === "revoked")
    return { key: "revoked", label: "Revogada", tone: "neutral" };
  if (credential.expires_at) {
    const left = Date.parse(credential.expires_at) - now;
    if (left <= 0)
      return { key: "expired", label: "Expirada", tone: "warning" };
    if (left <= EXPIRING_WINDOW)
      return { key: "expiring", label: "Vence em breve", tone: "warning" };
  }
  return { key: "active", label: "Ativa", tone: "success" };
}

export function expiryNote(
  credential: PartnerCredential,
  now: number = Date.now(),
): string {
  if (credential.status === "revoked")
    return credential.revoked_at
      ? `Revogada ${relativeTime(credential.revoked_at, now)}`
      : "Revogada";
  if (!credential.expires_at) return "Sem prazo definido";
  const left = Date.parse(credential.expires_at) - now;
  if (left <= 0) return `Venceu ${relativeTime(credential.expires_at, now)}`;
  if (left < HOUR)
    return `Vence em ${Math.max(1, Math.floor(left / 60_000))} min`;
  if (left < DAY) return `Vence em ${Math.floor(left / HOUR)} h`;
  return `Vence em ${Math.floor(left / DAY)} d`;
}
