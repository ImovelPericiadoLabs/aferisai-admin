import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  activateAnalysisProviderAccount,
  putOrganizationLogoWithProgress,
} from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("ativação de conta de provedor", () => {
  it("envia versão, modelo, hash do perfil, reserva e motivo com CSRF", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "p1" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const body = {
      expected_version: 3,
      model: "gemini-3.5-flash-lite",
      expected_profile_sha256: "a".repeat(64),
      external_reserved: 2,
      reason: "ativar conta aprovada",
    };
    await activateAnalysisProviderAccount("p1", body, "csrf-token");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      "/v1/team/analysis-provider-accounts/p1/activate",
    );
    expect(init.method).toBe("POST");
    expect(init.headers["X-CSRF-Token"]).toBe("csrf-token");
    expect(JSON.parse(init.body as string)).toEqual(body);
  });
});

class FakeXhr {
  static last: FakeXhr;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  withCredentials = false;
  status = 0;
  responseText = "";
  upload: {
    onprogress:
      | ((event: {
          lengthComputable: boolean;
          loaded: number;
          total: number;
        }) => void)
      | null;
  } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send() {}
}

describe("envio do logo com progresso", () => {
  it("usa PUT com cookie, CSRF e tipo, reporta progresso e devolve o JSON", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const progress: number[] = [];
    const promise = putOrganizationLogoWithProgress(
      "o1",
      new Blob(["x"], { type: "image/png" }),
      "tok",
      (fraction) => progress.push(fraction),
    );
    const xhr = FakeXhr.last;
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 });
    xhr.status = 200;
    xhr.responseText = JSON.stringify({
      logo_url: "/m/l",
      width: 10,
      height: 10,
    });
    xhr.onload?.();
    await expect(promise).resolves.toEqual({
      logo_url: "/m/l",
      width: 10,
      height: 10,
    });
    expect(progress).toEqual([0.5]);
    expect(xhr.method).toBe("PUT");
    expect(xhr.url).toMatch(/\/v1\/team\/organizations\/o1\/logo$/);
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.headers["Content-Type"]).toBe("image/png");
    expect(xhr.headers["X-CSRF-Token"]).toBe("tok");
  });

  it("rejeita com o erro do servidor em respostas 4xx", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const promise = putOrganizationLogoWithProgress(
      "o1",
      new Blob(["x"], { type: "image/png" }),
      "tok",
      () => undefined,
    );
    const xhr = FakeXhr.last;
    xhr.status = 422;
    xhr.responseText = JSON.stringify({
      code: "LOGO_TOO_BIG",
      detail: "Imagem grande demais.",
    });
    xhr.onload?.();
    await expect(promise).rejects.toMatchObject({
      status: 422,
      code: "LOGO_TOO_BIG",
      detail: "Imagem grande demais.",
    });
  });

  it("rejeita com status 0 quando a rede falha", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const promise = putOrganizationLogoWithProgress(
      "o1",
      new Blob(["x"], { type: "image/png" }),
      "tok",
      () => undefined,
    );
    FakeXhr.last.onerror?.();
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 0 });
  });
});
