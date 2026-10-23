import { describe, expect, it } from "vitest";
import type { RegistrySupplierAccount } from "./api";
import {
  activationBlock,
  shortDigest,
  supplierBody,
  supplierStatusView,
  supplierLabel,
  validateSupplierForm,
  type SupplierForm,
} from "./supplier-model";

const form = (o: Partial<SupplierForm> = {}): SupplierForm => ({
  label: "RI Digital principal",
  provider: "onr",
  email: "operacao@empresa.com.br",
  password: "senha-de-teste",
  token: "",
  portalDigest: "",
  reason: "Reutiliza a conta do Imovel, conforme decisão do produto.",
  ...o,
});

const account = (
  o: Partial<RegistrySupplierAccount> = {},
): RegistrySupplierAccount => ({
  id: "a1",
  label: "RI Digital",
  provider: "onr",
  account_binding_sha256: "a".repeat(64),
  credential_hint: "op…@empresa",
  status: "draft",
  version: 1,
  created_at: "2026-10-23T10:00:00Z",
  updated_at: "2026-10-23T10:00:00Z",
  ...o,
});

describe("validateSupplierForm", () => {
  it("accepts a complete RI Digital account without a token", () => {
    expect(validateSupplierForm(form())).toEqual({ ok: true, errors: {} });
  });
  it("requires a token and RI Digital account binding for InfoSimples", () => {
    const missing = validateSupplierForm(form({ provider: "infosimples" }));
    expect(missing.ok).toBe(false);
    expect(missing.errors.token).toMatch(/token/i);
    expect(missing.errors.portalDigest).toMatch(/RI Digital/i);
    expect(
      validateSupplierForm(form({ provider: "infosimples", token: "tk-1" })).ok,
    ).toBe(false);
    expect(
      validateSupplierForm(
        form({
          provider: "infosimples",
          token: "tk-1",
          portalDigest: "a".repeat(64),
        }),
      ).ok,
    ).toBe(true);
  });
  it("checks every field against the backend limits", () => {
    const result = validateSupplierForm(
      form({ label: "ab", email: "x", password: "", reason: "curto" }),
    );
    expect(Object.keys(result.errors).sort()).toEqual([
      "email",
      "label",
      "password",
      "reason",
    ]);
    expect(
      validateSupplierForm(form({ label: "a".repeat(121) })).errors.label,
    ).toBeTruthy();
    expect(
      validateSupplierForm(form({ label: "   x   " })).errors.label,
    ).toBeTruthy();
    expect(
      validateSupplierForm(form({ password: "x".repeat(4097) })).errors
        .password,
    ).toBeTruthy();
  });
  it("accepts a required portal digest only as 64 hex characters", () => {
    const base = { provider: "infosimples" as const, token: "tk" };
    expect(
      validateSupplierForm(form({ ...base, portalDigest: "A".repeat(64) })).ok,
    ).toBe(true);
    expect(
      validateSupplierForm(form({ ...base, portalDigest: "zz" })).errors
        .portalDigest,
    ).toBeTruthy();
  });
});

describe("supplierBody", () => {
  it("builds the request exactly, trimming text but never the secrets", () => {
    expect(
      supplierBody(
        form({
          label: "  RI  Digital ",
          email: " op@x.com ",
          password: " p ",
          reason: "  Motivo suficiente aqui  ",
        }),
      ),
    ).toEqual({
      label: "RI  Digital",
      provider: "onr",
      email: "op@x.com",
      password: " p ",
      token: null,
      portal_account_sha256: null,
      reason: "Motivo suficiente aqui",
    });
  });
  it("sends token and a lowercase digest for InfoSimples, nothing extra for RI Digital", () => {
    const body = supplierBody(
      form({
        provider: "infosimples",
        token: "tk",
        portalDigest: "AB".repeat(32),
      }),
    );
    expect(body.token).toBe("tk");
    expect(body.portal_account_sha256).toBe("ab".repeat(32));
    const onr = supplierBody(
      form({
        provider: "onr",
        token: "ignored",
        portalDigest: "ab".repeat(32),
      }),
    );
    expect(onr.token).toBeNull();
    expect(onr.portal_account_sha256).toBeNull();
  });
});

describe("labels", () => {
  it("names providers and states", () => {
    expect(supplierLabel("onr")).toBe("RI Digital (ONR)");
    expect(supplierLabel("infosimples")).toBe("InfoSimples");
    expect(supplierStatusView("draft")).toEqual({
      label: "Rascunho",
      tone: "neutral",
    });
    expect(supplierStatusView("active")).toEqual({
      label: "Ativa",
      tone: "success",
    });
    expect(supplierStatusView("suspended")).toEqual({
      label: "Suspensa",
      tone: "warning",
    });
  });
  it("shortens a digest for display", () => {
    expect(shortDigest("a".repeat(64))).toBe("aaaaaaaa…aaaa");
  });
});

describe("activationBlock", () => {
  it("allows activating a draft or suspended account when no other is active", () => {
    expect(activationBlock(account(), [account()])).toBeNull();
    expect(
      activationBlock(account({ status: "suspended" }), [
        account({ status: "suspended" }),
      ]),
    ).toBeNull();
  });
  it("explains why an active account or a second active one is blocked", () => {
    expect(activationBlock(account({ status: "active" }), [])).toMatch(
      /já está ativa/i,
    );
    const other = account({ id: "a2", status: "active" });
    expect(activationBlock(account(), [account(), other])).toMatch(/suspenda/i);
    // another provider does not block
    expect(
      activationBlock(account({ provider: "infosimples" }), [other]),
    ).toBeNull();
  });
});
