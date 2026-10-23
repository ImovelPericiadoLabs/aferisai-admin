import type { PartnerInvitationSummary, PartnerPerson } from "./api";
import { relativeTime } from "./integration-insights-model";

export type PersonAction = "resend" | "revoke" | "suspend" | "reactivate";
export type PersonTone = "success" | "warning" | "info" | "neutral";

export function personView(
  person: PartnerPerson,
  isAdmin: boolean,
): { label: string; tone: PersonTone; actions: PersonAction[] } {
  const view = baseView(person);
  return { ...view, actions: isAdmin ? view.actions : [] };
}

function baseView(person: PartnerPerson): {
  label: string;
  tone: PersonTone;
  actions: PersonAction[];
} {
  if (person.membership_status === "suspended")
    return { label: "Suspenso", tone: "warning", actions: ["reactivate"] };
  if (person.membership_status === "active")
    return { label: "Ativo", tone: "success", actions: ["suspend"] };
  switch (person.invitation?.status) {
    case "smtp_accepted":
      return {
        label: "Convite enviado",
        tone: "info",
        actions: ["resend", "revoke"],
      };
    case "delivery_unconfirmed":
      return {
        label: "Envio não confirmado",
        tone: "warning",
        actions: ["resend", "revoke"],
      };
    case "expired":
      return {
        label: "Convite expirado",
        tone: "neutral",
        actions: ["resend"],
      };
    case "revoked":
      return { label: "Convite revogado", tone: "neutral", actions: [] };
    case "blocked":
      return {
        label: "Bloqueado após tentativas",
        tone: "warning",
        actions: ["resend", "revoke"],
      };
    case "accepted":
      return {
        label: "Aceito, aguardando ativação",
        tone: "info",
        actions: [],
      };
    default:
      return { label: "Convidado", tone: "neutral", actions: [] };
  }
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function untilText(iso: string, now: number): string {
  const diff = Math.max(0, Date.parse(iso) - now);
  if (diff < HOUR) return `em ${Math.max(1, Math.floor(diff / MIN))} min`;
  if (diff < DAY) return `em ${Math.floor(diff / HOUR)} h`;
  return `em ${Math.floor(diff / DAY)} d`;
}

export function invitationNote(
  invitation: PartnerInvitationSummary | null,
  now: number = Date.now(),
): string | null {
  if (!invitation) return null;
  if (invitation.status === "accepted" || invitation.status === "revoked")
    return null;
  const sent = `Enviado ${relativeTime(invitation.created_at, now)}`;
  return invitation.status === "expired"
    ? `${sent} · expirou ${relativeTime(invitation.expires_at, now)}`
    : `${sent} · expira ${untilText(invitation.expires_at, now)}`;
}

const EVENT_LABELS: Record<string, string> = {
  invited: "Convite enviado",
  resent: "Convite reenviado",
  revoked: "Convite revogado",
  accepted: "Convite aceito",
  suspended: "Acesso suspenso",
  reactivated: "Acesso reativado",
};

export const eventLabel = (action: string) =>
  EVENT_LABELS[action] ?? "Evento registrado";

export type PeopleFilter = "all" | "active" | "pending" | "suspended";

export function filterPeople(
  items: PartnerPerson[],
  filter: PeopleFilter,
): PartnerPerson[] {
  if (filter === "all") return items;
  const status =
    filter === "active"
      ? "active"
      : filter === "pending"
        ? "invited"
        : "suspended";
  return items.filter((item) => item.membership_status === status);
}

export function countPeople(
  items: PartnerPerson[],
): Record<PeopleFilter, number> {
  return {
    all: items.length,
    active: filterPeople(items, "active").length,
    pending: filterPeople(items, "pending").length,
    suspended: filterPeople(items, "suspended").length,
  };
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  invited: "Convidado",
};

export const statusValueLabel = (value: string | null) =>
  value === null ? "—" : (STATUS_LABELS[value] ?? value);
