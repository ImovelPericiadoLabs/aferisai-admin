import { describe, expect, it } from "vitest";
import {
  buildExample,
  canonicalBody,
  curlFor,
  eventCatalog,
  signBody,
} from "./webhook-payloads";

// Reference values produced with the backend's own algorithm
// (app/integrations/svc/webhook_transport.py:17-30): json.dumps(...,
// separators=(",", ":"), sort_keys=True) and HMAC-SHA256 of the UTF-8 bytes.
const TEST_BODY =
  '{"event":"webhook.test","id":"0192a8c0-0000-7000-8000-000000000001","message":"Teste de integra\\u00e7\\u00e3o AferisAI","occurred_at":"2026-10-23T12:00:00.123456+00:00"}';
const TEST_DIGEST =
  "6681aafa3640b99fe097885dacf0b45afc33f81471b6f7722613550dbf7cadaf";
const DONE_BODY =
  '{"analysis_request_id":"0192a8c0-1111-7000-8000-000000000003","connection_id":"0192a8c0-2222-7000-8000-000000000004","event":"analysis.completed","id":"0192a8c0-0000-7000-8000-000000000002","occurred_at":"2026-10-23T12:05:00+00:00"}';
const DONE_DIGEST =
  "8ec96e7d2623cec396a73f41fc019178ba2f29fd680d23a5a695647608ba536b";

describe("canonicalBody", () => {
  it("matches the backend bytes, sorted keys and escaped non-ASCII included", () => {
    expect(
      canonicalBody(
        "0192a8c0-0000-7000-8000-000000000001",
        "webhook.test",
        "2026-10-23T12:00:00.123456+00:00",
        { message: "Teste de integração AferisAI" },
      ),
    ).toBe(TEST_BODY);
    expect(
      canonicalBody(
        "0192a8c0-0000-7000-8000-000000000002",
        "analysis.completed",
        "2026-10-23T12:05:00+00:00",
        {
          analysis_request_id: "0192a8c0-1111-7000-8000-000000000003",
          connection_id: "0192a8c0-2222-7000-8000-000000000004",
        },
      ),
    ).toBe(DONE_BODY);
  });
  it("escapes like Python for quotes, control characters, DEL and emoji", () => {
    expect(canonicalBody("i", "e", "t", { m: 'a"b\n\u007f😀' })).toBe(
      '{"event":"e","id":"i","m":"a\\"b\\n\\u007f\\ud83d\\ude00","occurred_at":"t"}',
    );
  });
});

describe("signBody", () => {
  it("matches the backend HMAC-SHA256 digests", async () => {
    expect(await signBody("whsec_exemplo", TEST_BODY)).toBe(TEST_DIGEST);
    expect(await signBody("whsec_exemplo", DONE_BODY)).toBe(DONE_DIGEST);
  });
});

describe("buildExample", () => {
  it("builds the signed request a partner would receive", async () => {
    const example = await buildExample(
      eventCatalog.find((e) => e.type === "webhook.test")!,
      "whsec_exemplo",
      {
        id: "0192a8c0-0000-7000-8000-000000000001",
        occurredAt: "2026-10-23T12:00:00.123456+00:00",
      },
    );
    expect(example.body).toBe(TEST_BODY);
    expect(example.headers).toEqual({
      "Content-Type": "application/json",
      "X-Aferis-Event-Id": "0192a8c0-0000-7000-8000-000000000001",
      "X-Aferis-Signature": `sha256=${TEST_DIGEST}`,
    });
    expect(JSON.parse(example.pretty)).toEqual(JSON.parse(TEST_BODY));
    expect(example.pretty).toContain("\n  ");
  });
});

describe("curlFor", () => {
  it("builds a safe curl command with the signed headers and body", () => {
    const command = curlFor(
      "https://api.exemplo.com.br/webhooks/aferis",
      { "Content-Type": "application/json", "X-Aferis-Signature": "sha256=ab" },
      `{"m":"it's"}`,
    );
    expect(command).toContain(
      "curl -X POST 'https://api.exemplo.com.br/webhooks/aferis'",
    );
    expect(command).toContain("-H 'X-Aferis-Signature: sha256=ab'");
    expect(command).toContain(`--data-raw '{"m":"it'\\''s"}'`);
  });
});

describe("eventCatalog", () => {
  it("marks only the two events that exist as implemented", () => {
    expect(
      eventCatalog.filter((e) => e.status === "implemented").map((e) => e.type),
    ).toEqual(["analysis.completed", "webhook.test"]);
  });
  it("documents every field of every event", () => {
    for (const event of eventCatalog)
      for (const name of Object.keys(event.data))
        expect(event.fields.some((f) => f.name === name)).toBe(true);
  });
});
