import { describe, expect, it } from "vitest";
import type { ApplicationAuditItem } from "./api";
import {
  actorLabel,
  auditTitle,
  auditTone,
  countAudit,
  filterAudit,
  statusChange,
} from "./audit-model";

const item = (o: Partial<ApplicationAuditItem> = {}): ApplicationAuditItem => ({
  id: "e1",
  source: "permission",
  action: "grant",
  subject_id: null,
  subject_code: "analysis:read",
  actor_team_member_id: "t1",
  actor_partner_member_id: null,
  previous_status: null,
  new_status: null,
  reason: null,
  created_at: "2026-10-23T12:00:00Z",
  ...o,
});

const label = (code: string) => `L(${code})`;

describe("auditTitle", () => {
  it("names permission changes with the permission label", () => {
    expect(auditTitle(item(), label)).toBe(
      "Permissão concedida: L(analysis:read)",
    );
    expect(auditTitle(item({ action: "revoke" }), label)).toBe(
      "Permissão revogada: L(analysis:read)",
    );
  });
  it("names credential and webhook changes", () => {
    expect(
      auditTitle(item({ source: "credential", action: "issue" }), label),
    ).toBe("Credencial emitida");
    expect(
      auditTitle(item({ source: "credential", action: "revoke" }), label),
    ).toBe("Credencial revogada");
    expect(
      auditTitle(item({ source: "webhook", action: "create" }), label),
    ).toBe("Webhook cadastrado");
    expect(
      auditTitle(item({ source: "webhook", action: "activate" }), label),
    ).toBe("Webhook ativado");
    expect(
      auditTitle(item({ source: "webhook", action: "suspend" }), label),
    ).toBe("Webhook suspenso");
    expect(
      auditTitle(item({ source: "webhook", action: "delete" }), label),
    ).toBe("Webhook removido");
  });
  it("stays readable for an unknown action", () => {
    expect(auditTitle(item({ source: "webhook", action: "novo" }), label)).toBe(
      "Alteração registrada em webhook",
    );
  });
});

describe("auditTone", () => {
  it("marks removals as attention and additions as success", () => {
    expect(auditTone(item({ action: "revoke" }))).toBe("warning");
    expect(auditTone(item({ source: "webhook", action: "suspend" }))).toBe(
      "warning",
    );
    expect(auditTone(item({ source: "webhook", action: "delete" }))).toBe(
      "warning",
    );
    expect(auditTone(item({ action: "grant" }))).toBe("success");
    expect(auditTone(item({ source: "credential", action: "issue" }))).toBe(
      "success",
    );
    expect(auditTone(item({ source: "webhook", action: "activate" }))).toBe(
      "success",
    );
  });
});

describe("actorLabel", () => {
  it("tells who acted without inventing names", () => {
    expect(actorLabel(item())).toBe("Equipe Aferis");
    expect(
      actorLabel(
        item({ actor_team_member_id: null, actor_partner_member_id: "p1" }),
      ),
    ).toBe("Pessoa do parceiro");
    expect(
      actorLabel(
        item({ actor_team_member_id: null, actor_partner_member_id: null }),
      ),
    ).toBe("Sistema");
  });
});

describe("actorLabel with the actor's e-mail", () => {
  it("appends the e-mail the backend resolved, for either kind of actor", () => {
    expect(actorLabel(item({ actor_label: "ana@aferis.ai" }))).toBe(
      "Equipe Aferis · ana@aferis.ai",
    );
    expect(
      actorLabel(
        item({
          actor_team_member_id: null,
          actor_partner_member_id: "p1",
          actor_label: "bia@parceiro.com.br",
        }),
      ),
    ).toBe("Pessoa do parceiro · bia@parceiro.com.br");
  });
  it("keeps the generic label when the identity no longer exists", () => {
    expect(actorLabel(item({ actor_label: null }))).toBe("Equipe Aferis");
  });
});

describe("statusChange", () => {
  it("translates webhook status transitions", () => {
    expect(
      statusChange(
        item({
          source: "webhook",
          previous_status: "active",
          new_status: "suspended",
        }),
      ),
    ).toBe("Ativo → Suspenso");
    expect(
      statusChange(
        item({ source: "webhook", previous_status: null, new_status: "draft" }),
      ),
    ).toBe("— → Em configuração");
    expect(statusChange(item())).toBeNull();
  });
});

describe("filterAudit and countAudit", () => {
  const items = [
    item({ id: "a" }),
    item({ id: "b", source: "credential", action: "issue" }),
    item({ id: "c", source: "webhook", action: "create" }),
  ];
  it("filters by source", () => {
    expect(filterAudit(items, "credential").map((i) => i.id)).toEqual(["b"]);
    expect(filterAudit(items, "all")).toHaveLength(3);
  });
  it("counts each source", () => {
    expect(countAudit(items)).toEqual({
      all: 3,
      permission: 1,
      credential: 1,
      webhook: 1,
    });
  });
});
