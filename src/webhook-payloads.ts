/**
 * Webhook event catalog and signing helpers. The signing code mirrors the
 * backend byte for byte (app/integrations/svc/webhook_transport.py:17-30):
 * compact JSON with sorted keys and ASCII escapes, HMAC-SHA256 of the UTF-8
 * bytes, header `X-Aferis-Signature: sha256=<hex>`. The tests pin it to values
 * produced by the backend's own algorithm.
 */
export type EventStatus = "implemented" | "proposed";

export type EventField = { name: string; type: string; description: string };

export type EventDefinition = {
  type: string;
  title: string;
  status: EventStatus;
  description: string;
  /** Example values of the event-specific fields (the backend sends strings). */
  data: Record<string, string>;
  fields: EventField[];
  source: string;
};

/** Fields every event carries (the envelope). */
export const envelopeFields: EventField[] = [
  {
    name: "id",
    type: "UUIDv7",
    description: "Identificador único do evento; use para ignorar repetições.",
  },
  {
    name: "event",
    type: "texto",
    description: "Tipo do evento, por exemplo analysis.completed.",
  },
  {
    name: "occurred_at",
    type: "data ISO 8601",
    description: "Quando o evento foi gerado, em UTC.",
  },
];

const SAMPLE_ANALYSIS = "0192a8c0-1111-7000-8000-000000000003";
const SAMPLE_CONNECTION = "0192a8c0-2222-7000-8000-000000000004";

const analysisField: EventField = {
  name: "analysis_request_id",
  type: "UUIDv7",
  description: "Análise a que o evento se refere.",
};
const connectionField: EventField = {
  name: "connection_id",
  type: "UUIDv7",
  description: "Conexão do titular que iniciou a análise.",
};

export const eventCatalog: EventDefinition[] = [
  {
    type: "analysis.completed",
    title: "Análise concluída",
    status: "implemented",
    description:
      "Enviado quando uma análise iniciada pela sua aplicação termina. Só a conexão que iniciou a análise recebe.",
    data: {
      analysis_request_id: SAMPLE_ANALYSIS,
      connection_id: SAMPLE_CONNECTION,
    },
    fields: [analysisField, connectionField],
    source: "workers/lanes/webhook_delivery_worker.py:97",
  },
  {
    type: "webhook.test",
    title: "Teste de integração",
    status: "implemented",
    description:
      "Evento fictício assinado, enviado pelo botão de teste. Não cria análise nem cobrança.",
    data: { message: "Teste de integração AferisAI" },
    fields: [
      {
        name: "message",
        type: "texto",
        description: "Mensagem fixa do teste.",
      },
    ],
    source: "app/integrations/svc/webhook_tests.py:48",
  },
  {
    type: "analysis.failed",
    title: "Análise com falha",
    status: "proposed",
    description: "Proposta: avisar quando a análise não pôde ser concluída.",
    data: {
      analysis_request_id: SAMPLE_ANALYSIS,
      connection_id: SAMPLE_CONNECTION,
      reason_code: "extraction_failed",
    },
    fields: [
      analysisField,
      connectionField,
      {
        name: "reason_code",
        type: "texto",
        description: "Motivo resumido da falha.",
      },
    ],
    source: "docs/partner-connection-blueprint.md:35",
  },
  {
    type: "analysis.needs_review",
    title: "Análise em revisão humana",
    status: "proposed",
    description:
      "Proposta: avisar quando a análise segue para conferência da equipe.",
    data: {
      analysis_request_id: SAMPLE_ANALYSIS,
      connection_id: SAMPLE_CONNECTION,
    },
    fields: [analysisField, connectionField],
    source: "docs/partner-connection-blueprint.md:35",
  },
  {
    type: "payment.received",
    title: "Pagamento recebido",
    status: "proposed",
    description: "Proposta: avisar quando o PIX do titular é confirmado.",
    data: {
      analysis_request_id: SAMPLE_ANALYSIS,
      connection_id: SAMPLE_CONNECTION,
      amount_cents: "1990",
    },
    fields: [
      analysisField,
      connectionField,
      {
        name: "amount_cents",
        type: "inteiro em texto",
        description: "Valor pago em centavos.",
      },
    ],
    source: "docs/partner-connection-blueprint.md:35",
  },
  {
    type: "connection.revoked",
    title: "Conexão revogada",
    status: "proposed",
    description:
      "Proposta: avisar quando o titular revoga o acesso da aplicação.",
    data: { connection_id: SAMPLE_CONNECTION },
    fields: [connectionField],
    source: "docs/partner-connection-blueprint.md:35",
  },
];

/** Compact JSON, sorted keys, non-ASCII escaped as Python's json.dumps does. */
export function canonicalBody(
  eventId: string,
  eventType: string,
  occurredAt: string,
  data: Record<string, string>,
): string {
  const merged: Record<string, string> = {
    id: eventId,
    event: eventType,
    occurred_at: occurredAt,
    ...data,
  };
  const sorted = Object.fromEntries(
    Object.keys(merged)
      .sort()
      .map((key) => [key, merged[key]]),
  );
  return JSON.stringify(sorted).replace(
    /[\u007f-￿]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

export async function signBody(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const SAMPLE_EVENT_ID = "0192a8c0-0000-7000-8000-000000000001";
export const SAMPLE_OCCURRED_AT = "2026-10-23T12:00:00.123456+00:00";
export const SAMPLE_SECRET = "whsec_exemplo_nao_use_em_producao";

export type SignedExample = {
  headers: Record<string, string>;
  /** The exact bytes that are signed and sent. */
  body: string;
  /** The same content indented for reading; the signature covers `body`. */
  pretty: string;
};

export async function buildExample(
  event: EventDefinition,
  secret: string,
  options: { id?: string; occurredAt?: string } = {},
): Promise<SignedExample> {
  const id = options.id ?? SAMPLE_EVENT_ID;
  const body = canonicalBody(
    id,
    event.type,
    options.occurredAt ?? SAMPLE_OCCURRED_AT,
    event.data,
  );
  const digest = await signBody(secret, body);
  return {
    headers: {
      "Content-Type": "application/json",
      "X-Aferis-Event-Id": id,
      "X-Aferis-Signature": `sha256=${digest}`,
    },
    body,
    pretty: JSON.stringify(JSON.parse(body), null, 2),
  };
}

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export function curlFor(
  url: string,
  headers: Record<string, string>,
  body: string,
): string {
  return [
    `curl -X POST ${shellQuote(url)}`,
    ...Object.entries(headers).map(
      ([name, value]) => `  -H ${shellQuote(`${name}: ${value}`)}`,
    ),
    `  --data-raw ${shellQuote(body)}`,
  ].join(" \\\n");
}

export const nodeVerifySnippet = `import { createHmac, timingSafeEqual } from "node:crypto";

// rawBody: os bytes exatos recebidos (não reserialize o JSON)
export function assinaturaValida(rawBody, cabecalho, segredo) {
  const esperado = "sha256=" + createHmac("sha256", segredo).update(rawBody).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(cabecalho ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}`;

export const pythonVerifySnippet = `import hashlib
import hmac

def assinatura_valida(raw_body: bytes, cabecalho: str, segredo: str) -> bool:
    # raw_body: os bytes exatos recebidos (não reserialize o JSON)
    esperado = "sha256=" + hmac.new(segredo.encode("ascii"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, cabecalho or "")`;
