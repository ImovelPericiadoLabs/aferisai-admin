import { describe, expect, it } from "vitest";
import {
  OFFICIAL_ORIGIN,
  changeSummary,
  endpointView,
  validateEndpointForm,
  validateProxyOrigin,
} from "./onr-endpoint-model";

const WORKER = "https://onr-ridigital-proxy.sec-devchamps.workers.dev";

describe("validateProxyOrigin", () => {
  it("accepts a Worker root and normalises it", () => {
    expect(validateProxyOrigin(` ${WORKER}/ `)).toEqual({
      ok: true,
      origin: WORKER,
    });
  });

  it.each([
    ["http://x.sec-devchamps.workers.dev", "HTTPS"],
    ["https://example.com", "sec-devchamps.workers.dev"],
    ["https://sec-devchamps.workers.dev.evil.com", "sec-devchamps.workers.dev"],
    [`${WORKER}/login`, "caminho"],
    [`${WORKER}?a=1`, "parâmetro"],
    [`${WORKER}#x`, "parâmetro"],
    ["https://user:pw@x.sec-devchamps.workers.dev", "usuário"],
    ["https://x.sec-devchamps.workers.dev:8443", "porta"],
    ["não é url", "endereço"],
    ["", "endereço"],
  ])("rejects %s", (raw, fragment) => {
    const result = validateProxyOrigin(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(fragment);
  });
});

describe("validateEndpointForm", () => {
  const base = {
    origin: WORKER,
    key: "",
    keyConfigured: true,
    replaceKey: false,
  };

  it("keeps the stored key when none is typed", () => {
    expect(validateEndpointForm(base)).toEqual({ ok: true, errors: {} });
  });

  it("requires a key when none is stored", () => {
    const result = validateEndpointForm({ ...base, keyConfigured: false });
    expect(result.errors.key).toMatch(/obrigatória/);
  });

  it("requires a long key when replacing", () => {
    const result = validateEndpointForm({
      ...base,
      replaceKey: true,
      key: "curta",
    });
    expect(result.errors.key).toMatch(/24/);
  });

  it("accepts a replacement key of 24+ characters", () => {
    const key = "k".repeat(24);
    expect(validateEndpointForm({ ...base, replaceKey: true, key }).ok).toBe(
      true,
    );
  });

  it("surfaces an origin error", () => {
    expect(
      validateEndpointForm({ ...base, origin: "https://x.com" }).errors.origin,
    ).toBeTruthy();
  });
});

describe("endpointView and changeSummary", () => {
  it("describes the official portal", () => {
    expect(
      endpointView({
        origin: OFFICIAL_ORIGIN,
        mode: "official",
        proxy_key_configured: false,
        version: 0,
      }),
    ).toMatchObject({
      title: "Portal original",
      tone: "neutral",
      key: "Não se aplica",
    });
  });

  it("describes the protected proxy", () => {
    expect(
      endpointView({
        origin: WORKER,
        mode: "proxy",
        proxy_key_configured: true,
        version: 3,
      }),
    ).toMatchObject({
      title: "Proxy protegido",
      tone: "info",
      key: "Guardada no cofre",
    });
  });

  it("names the key action in the confirmation", () => {
    const current = {
      origin: OFFICIAL_ORIGIN,
      mode: "official" as const,
      proxy_key_configured: false,
      version: 1,
    };
    const keys = (rows: { label: string; value: string }[]) =>
      rows.find((r) => r.label === "Chave")?.value;
    expect(
      keys(
        changeSummary(current, {
          origin: WORKER,
          replaceKey: true,
          keyConfigured: false,
        }),
      ),
    ).toBe("Será definida");
    expect(
      keys(
        changeSummary(
          {
            ...current,
            mode: "proxy",
            origin: WORKER,
            proxy_key_configured: true,
          },
          { origin: WORKER, replaceKey: false, keyConfigured: true },
        ),
      ),
    ).toBe("Mantida");
    expect(
      keys(
        changeSummary(
          {
            ...current,
            mode: "proxy",
            origin: WORKER,
            proxy_key_configured: true,
          },
          { origin: WORKER, replaceKey: true, keyConfigured: true },
        ),
      ),
    ).toBe("Será trocada");
  });
});
