import { describe, expect, it } from "vitest";
import type { PartnerCredential } from "./api";
import { credentialState, expiryNote } from "./credential-model";

const NOW = Date.parse("2026-10-23T12:00:00Z");
const DAY = 86_400_000;

const credential = (o: Partial<PartnerCredential> = {}): PartnerCredential => ({
  id: "c1",
  client_id: "cli_1",
  status: "active",
  created_at: "2026-09-01T00:00:00Z",
  revoked_at: null,
  issue_request_id: null,
  expires_at: new Date(NOW + 60 * DAY).toISOString(),
  ...o,
});

describe("credentialState", () => {
  it("is active far from the expiry", () => {
    expect(credentialState(credential(), NOW)).toEqual({
      key: "active",
      label: "Ativa",
      tone: "success",
    });
  });
  it("warns within 14 days of the expiry", () => {
    expect(
      credentialState(
        credential({ expires_at: new Date(NOW + 5 * DAY).toISOString() }),
        NOW,
      ),
    ).toEqual({ key: "expiring", label: "Vence em breve", tone: "warning" });
  });
  it("is expired after the expiry and revoked when revoked", () => {
    expect(
      credentialState(
        credential({ expires_at: new Date(NOW - DAY).toISOString() }),
        NOW,
      ).key,
    ).toBe("expired");
    expect(credentialState(credential({ status: "revoked" }), NOW)).toEqual({
      key: "revoked",
      label: "Revogada",
      tone: "neutral",
    });
  });
  it("treats no expiry as active", () => {
    expect(credentialState(credential({ expires_at: null }), NOW).key).toBe(
      "active",
    );
  });
});

describe("expiryNote", () => {
  it("speaks about the expiry", () => {
    expect(expiryNote(credential(), NOW)).toBe("Vence em 60 d");
    expect(
      expiryNote(
        credential({ expires_at: new Date(NOW + 3 * 3_600_000).toISOString() }),
        NOW,
      ),
    ).toBe("Vence em 3 h");
    expect(
      expiryNote(
        credential({ expires_at: new Date(NOW - 3 * DAY).toISOString() }),
        NOW,
      ),
    ).toBe("Venceu há 3 d");
    expect(expiryNote(credential({ expires_at: null }), NOW)).toBe(
      "Sem prazo definido",
    );
  });
  it("shows when it was revoked", () => {
    expect(
      expiryNote(
        credential({
          status: "revoked",
          revoked_at: new Date(NOW - 2 * DAY).toISOString(),
        }),
        NOW,
      ),
    ).toBe("Revogada há 2 d");
  });
});
