import { describe, expect, it } from "vitest";
import {
  buildExample,
  canonicalBody,
  curlFor,
  eventCatalog,
  signBody,
} from "./webhook-payloads";

// Reference values produced by the backend's own functions, run on the backend
// virtualenv (app/integrations/svc/webhook_transport.py: signed_payload and
// webhook_signature, backend HEAD bff5303): typed v1 envelope, json.dumps with
// compact separators and sorted keys, HMAC-SHA256 over "<timestamp>.<body>".
const EVENT_ID = "0192a8c0-0000-7000-8000-000000000001";
const APPLICATION_ID = "0192a8c0-0000-7000-8000-000000000002";
const CONNECTION_ID = "0192a8c0-2222-7000-8000-000000000004";
const ANALYSIS_ID = "0192a8c0-1111-7000-8000-000000000003";
const TIMESTAMP = "2026-10-23T12:00:01.000000+00:00";

const CREATED_BODY =
  '{"application_id":"0192a8c0-0000-7000-8000-000000000002","connection_id":"0192a8c0-2222-7000-8000-000000000004","data":{"analysis_request_id":"0192a8c0-1111-7000-8000-000000000003"},"event":"analysis.created","id":"0192a8c0-0000-7000-8000-000000000001","occurred_at":"2026-10-23T12:00:00.123456Z","version":1}';
const CREATED_SIGNATURE =
  "sha256=8bfa4cf34429712a4734ae42959b554825dd46e93a3d530b55801aeda6f23e72";
const COMPLETED_BODY =
  '{"application_id":"0192a8c0-0000-7000-8000-000000000002","connection_id":"0192a8c0-2222-7000-8000-000000000004","data":{"analysis_request_id":"0192a8c0-1111-7000-8000-000000000003"},"event":"analysis.completed","id":"0192a8c0-0000-7000-8000-000000000001","occurred_at":"2026-10-23T12:05:00Z","version":1}';
const COMPLETED_SIGNATURE =
  "sha256=65ede87575063d42c7bf15fc199ebba80a0c5b045304961a83761ab4e121e737";
const TEST_BODY =
  '{"application_id":"0192a8c0-0000-7000-8000-000000000002","connection_id":null,"data":{"message":"Teste de integra\\u00e7\\u00e3o AferisAI","synthetic":true},"event":"webhook.test","id":"0192a8c0-0000-7000-8000-000000000001","occurred_at":"2026-10-23T12:00:00.123456Z","version":1}';
const TEST_SIGNATURE =
  "sha256=f9a99dec60615f873360bd7a3a5b648f827187cea8f2e4f5349520b0cfc1896f";

describe("canonicalBody", () => {
  it("matches the backend bytes for the three real events", () => {
    expect(
      canonicalBody({
        id: EVENT_ID,
        event: "analysis.created",
        occurredAt: "2026-10-23T12:00:00.123456Z",
        applicationId: APPLICATION_ID,
        connectionId: CONNECTION_ID,
        data: { analysis_request_id: ANALYSIS_ID },
      }),
    ).toBe(CREATED_BODY);
    expect(
      canonicalBody({
        id: EVENT_ID,
        event: "analysis.completed",
        occurredAt: "2026-10-23T12:05:00Z",
        applicationId: APPLICATION_ID,
        connectionId: CONNECTION_ID,
        data: { analysis_request_id: ANALYSIS_ID },
      }),
    ).toBe(COMPLETED_BODY);
    expect(
      canonicalBody({
        id: EVENT_ID,
        event: "webhook.test",
        occurredAt: "2026-10-23T12:00:00.123456Z",
        applicationId: APPLICATION_ID,
        connectionId: null,
        data: { message: "Teste de integração AferisAI", synthetic: true },
      }),
    ).toBe(TEST_BODY);
  });
  it("escapes like Python for quotes, control characters, DEL and emoji, at any depth", () => {
    expect(
      canonicalBody({
        id: "i",
        event: "e",
        occurredAt: "t",
        applicationId: "a",
        connectionId: null,
        data: { m: 'a"b\n\u007f😀' },
      }),
    ).toBe(
      '{"application_id":"a","connection_id":null,"data":{"m":"a\\"b\\n\\u007f\\ud83d\\ude00"},"event":"e","id":"i","occurred_at":"t","version":1}',
    );
  });
});

describe("signBody", () => {
  it("signs the timestamp, a dot and the exact body", async () => {
    expect(
      `sha256=${await signBody("whsec_exemplo", TIMESTAMP, CREATED_BODY)}`,
    ).toBe(CREATED_SIGNATURE);
    expect(
      `sha256=${await signBody("whsec_exemplo", TIMESTAMP, COMPLETED_BODY)}`,
    ).toBe(COMPLETED_SIGNATURE);
    expect(
      `sha256=${await signBody("whsec_exemplo", TIMESTAMP, TEST_BODY)}`,
    ).toBe(TEST_SIGNATURE);
  });
  it("is not the signature of the body alone", async () => {
    const withoutTimestamp = await signBody("whsec_exemplo", "", CREATED_BODY);
    expect(`sha256=${withoutTimestamp}`).not.toBe(CREATED_SIGNATURE);
  });
});

describe("buildExample", () => {
  const options = {
    id: EVENT_ID,
    occurredAt: "2026-10-23T12:00:00.123456Z",
    applicationId: APPLICATION_ID,
    connectionId: CONNECTION_ID,
    analysisRequestId: ANALYSIS_ID,
    timestamp: TIMESTAMP,
  };
  it("builds the signed request a partner would receive, with every header", async () => {
    const example = await buildExample(
      eventCatalog.find((e) => e.type === "analysis.created")!,
      "whsec_exemplo",
      options,
    );
    expect(example.body).toBe(CREATED_BODY);
    expect(example.headers).toEqual({
      "Content-Type": "application/json",
      "X-Aferis-Event-Id": EVENT_ID,
      "X-Aferis-Timestamp": TIMESTAMP,
      "X-Aferis-Key-Version": "1",
      "X-Aferis-Signature": CREATED_SIGNATURE,
    });
    expect(JSON.parse(example.pretty)).toEqual(JSON.parse(CREATED_BODY));
    expect(example.pretty).toContain("\n  ");
  });
  it("sends a null connection and a synthetic marker for the test event", async () => {
    const example = await buildExample(
      eventCatalog.find((e) => e.type === "webhook.test")!,
      "whsec_exemplo",
      options,
    );
    expect(example.body).toBe(TEST_BODY);
    expect(example.headers["X-Aferis-Signature"]).toBe(TEST_SIGNATURE);
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
  it("marks the three events the backend sends as implemented", () => {
    expect(
      eventCatalog.filter((e) => e.status === "implemented").map((e) => e.type),
    ).toEqual(["analysis.created", "analysis.completed", "webhook.test"]);
  });
  it("lets only the two analysis events be selected", () => {
    expect(
      eventCatalog.filter((e) => e.subscribable).map((e) => e.type),
    ).toEqual(["analysis.created", "analysis.completed"]);
  });
  it("documents every field of every event", () => {
    for (const event of eventCatalog)
      for (const name of Object.keys(event.data))
        expect(event.fields.some((f) => f.name === `data.${name}`)).toBe(true);
  });
});
