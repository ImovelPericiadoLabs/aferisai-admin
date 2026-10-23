import { describe, expect, it } from "vitest";
import type { PartnerInvitationSummary, PartnerPerson } from "./api";
import {
  countPeople,
  eventLabel,
  statusValueLabel,
  filterPeople,
  invitationNote,
  personView,
} from "./partner-people-model";

const NOW = Date.parse("2026-10-23T12:00:00Z");

const invitation = (
  o: Partial<PartnerInvitationSummary> = {},
): PartnerInvitationSummary => ({
  id: "i1",
  status: "smtp_accepted",
  actor_team_member_id: "t1",
  created_at: "2026-10-22T12:00:00Z",
  expires_at: "2026-10-23T18:00:00Z",
  attempted_at: "2026-10-22T12:00:01Z",
  smtp_accepted_at: "2026-10-22T12:00:02Z",
  consumed_at: null,
  revoked_at: null,
  confirmation_blocked_at: null,
  ...o,
});

const person = (o: Partial<PartnerPerson> = {}): PartnerPerson => ({
  id: "m1",
  membership_id: "ms1",
  email: "ana@parceiro.com.br",
  identity_status: "active",
  membership_status: "active",
  last_access_at: null,
  invitation: null,
  ...o,
});

describe("personView", () => {
  it("lets an administrator suspend an active person", () => {
    expect(personView(person(), true)).toEqual({
      label: "Ativo",
      tone: "success",
      actions: ["suspend"],
    });
  });
  it("lets an administrator reactivate a suspended person", () => {
    expect(
      personView(person({ membership_status: "suspended" }), true),
    ).toEqual({
      label: "Suspenso",
      tone: "warning",
      actions: ["reactivate"],
    });
  });
  it("maps pending invitations to labels and allowed actions", () => {
    const pending = (status: PartnerInvitationSummary["status"]) =>
      personView(
        person({
          membership_status: "invited",
          invitation: invitation({ status }),
        }),
        true,
      );
    expect(pending("smtp_accepted")).toEqual({
      label: "Convite enviado",
      tone: "info",
      actions: ["resend", "revoke"],
    });
    expect(pending("delivery_unconfirmed")).toEqual({
      label: "Envio não confirmado",
      tone: "warning",
      actions: ["resend", "revoke"],
    });
    expect(pending("expired")).toEqual({
      label: "Convite expirado",
      tone: "neutral",
      actions: ["resend"],
    });
    expect(pending("revoked")).toEqual({
      label: "Convite revogado",
      tone: "neutral",
      actions: [],
    });
    expect(pending("blocked")).toEqual({
      label: "Bloqueado após tentativas",
      tone: "warning",
      actions: ["resend", "revoke"],
    });
    expect(pending("accepted")).toEqual({
      label: "Aceito, aguardando ativação",
      tone: "info",
      actions: [],
    });
  });
  it("offers no actions to non-administrators", () => {
    expect(personView(person(), false).actions).toEqual([]);
    expect(
      personView(
        person({ membership_status: "invited", invitation: invitation() }),
        false,
      ).actions,
    ).toEqual([]);
  });
  it("handles a link with no invitation on record", () => {
    expect(personView(person({ membership_status: "invited" }), true)).toEqual({
      label: "Convidado",
      tone: "neutral",
      actions: [],
    });
  });
});

describe("invitationNote", () => {
  it("tells when the invitation expires or expired", () => {
    expect(invitationNote(invitation(), NOW)).toBe(
      "Enviado há 1 d · expira em 6 h",
    );
    expect(
      invitationNote(
        invitation({ status: "expired", expires_at: "2026-10-22T12:00:00Z" }),
        NOW,
      ),
    ).toBe("Enviado há 1 d · expirou há 1 d");
  });
  it("is empty once accepted or revoked", () => {
    expect(invitationNote(invitation({ status: "accepted" }), NOW)).toBeNull();
    expect(invitationNote(invitation({ status: "revoked" }), NOW)).toBeNull();
    expect(invitationNote(null, NOW)).toBeNull();
  });
});

describe("eventLabel", () => {
  it("names every audited action", () => {
    expect(eventLabel("invited")).toBe("Convite enviado");
    expect(eventLabel("resent")).toBe("Convite reenviado");
    expect(eventLabel("revoked")).toBe("Convite revogado");
    expect(eventLabel("accepted")).toBe("Convite aceito");
    expect(eventLabel("suspended")).toBe("Acesso suspenso");
    expect(eventLabel("reactivated")).toBe("Acesso reativado");
    expect(eventLabel("algo")).toBe("Evento registrado");
  });
});

describe("filterPeople and countPeople", () => {
  const items = [
    person({ id: "a" }),
    person({ id: "b", membership_status: "invited", invitation: invitation() }),
    person({ id: "c", membership_status: "suspended" }),
  ];
  it("filters by link state", () => {
    expect(filterPeople(items, "active").map((p) => p.id)).toEqual(["a"]);
    expect(filterPeople(items, "pending").map((p) => p.id)).toEqual(["b"]);
    expect(filterPeople(items, "suspended").map((p) => p.id)).toEqual(["c"]);
    expect(filterPeople(items, "all")).toHaveLength(3);
  });
  it("counts each group", () => {
    expect(countPeople(items)).toEqual({
      all: 3,
      active: 1,
      pending: 1,
      suspended: 1,
    });
  });
});

describe("statusValueLabel", () => {
  it("translates audited states and keeps unknown values readable", () => {
    expect(statusValueLabel("active")).toBe("Ativo");
    expect(statusValueLabel("suspended")).toBe("Suspenso");
    expect(statusValueLabel("invited")).toBe("Convidado");
    expect(statusValueLabel(null)).toBe("—");
    expect(statusValueLabel("outro")).toBe("outro");
  });
});
