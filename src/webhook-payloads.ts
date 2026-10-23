/**
 * Webhook event catalog and signing helpers. The code mirrors the backend byte for
 * byte (app/integrations/svc/webhook_transport.py, backend HEAD bff5303): a typed v1
 * envelope serialized as compact JSON with sorted keys and ASCII escapes, signed with
 * HMAC-SHA256 over "<X-Aferis-Timestamp>.<body>", header `X-Aferis-Signature:
 * sha256=<hex>`. The tests pin it to values produced by the backend's own functions.
 */
export type EventStatus = "implemented" | "proposed";

export type EventField = { name: string; type: string; description: string };

export type EventDefinition = {
  type: string;
  title: string;
  status: EventStatus;
  /** Can be chosen in the endpoint's event selection (webhook.test cannot). */
  subscribable: boolean;
  /** The event carries the connection that started the analysis. */
  hasConnection: boolean;
  description: string;
  /** Example values of the event-specific fields, inside `data`. */
  data: Record<string, unknown>;
  fields: EventField[];
  source: string;
};

/** Fields every event carries (the v1 envelope). */
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
    name: "version",
    type: "inteiro",
    description: "Versão do formato do evento. Hoje sempre 1.",
  },
  {
    name: "occurred_at",
    type: "data ISO 8601",
    description: "Quando o evento foi gerado, em UTC.",
  },
  {
    name: "application_id",
    type: "UUIDv7",
    description: "Aplicação que recebe o evento.",
  },
  {
    name: "connection_id",
    type: "UUIDv7 ou nulo",
    description:
      "Conexão do titular que iniciou a análise; nulo no evento de teste.",
  },
  {
    name: "data",
    type: "objeto",
    description: "Campos específicos do evento, listados abaixo.",
  },
];

const SAMPLE_ANALYSIS = "0192a8c0-1111-7000-8000-000000000003";
const SAMPLE_APPLICATION = "0192a8c0-0000-7000-8000-000000000002";
const SAMPLE_CONNECTION = "0192a8c0-2222-7000-8000-000000000004";

const analysisField: EventField = {
  name: "data.analysis_request_id",
  type: "UUIDv7",
  description: "Análise a que o evento se refere.",
};

export const eventCatalog: EventDefinition[] = [
  {
    type: "analysis.created",
    title: "Análise criada",
    status: "implemented",
    subscribable: true,
    hasConnection: true,
    description:
      "Enviado quando uma análise iniciada pela sua aplicação é criada. Só a conexão que iniciou a análise recebe.",
    data: { analysis_request_id: SAMPLE_ANALYSIS },
    fields: [analysisField],
    source: "app/integrations/webhook_events.py:30",
  },
  {
    type: "analysis.completed",
    title: "Análise concluída",
    status: "implemented",
    subscribable: true,
    hasConnection: true,
    description:
      "Enviado quando uma análise iniciada pela sua aplicação termina. Só a conexão que iniciou a análise recebe.",
    data: { analysis_request_id: SAMPLE_ANALYSIS },
    fields: [analysisField],
    source: "app/integrations/webhook_events.py:35",
  },
  {
    type: "webhook.test",
    title: "Teste de integração",
    status: "implemented",
    subscribable: false,
    hasConnection: false,
    description:
      "Evento fictício assinado, enviado pelo botão de teste. Não cria análise nem cobrança e não pode ser selecionado.",
    data: { message: "Teste de integração AferisAI", synthetic: true },
    fields: [
      {
        name: "data.message",
        type: "texto",
        description: "Mensagem fixa do teste.",
      },
      {
        name: "data.synthetic",
        type: "booleano",
        description: "Sempre true: marca o evento como fictício.",
      },
    ],
    source: "app/integrations/webhook_events.py:17",
  },
  {
    type: "analysis.failed",
    title: "Análise com falha",
    status: "proposed",
    subscribable: false,
    hasConnection: true,
    description: "Proposta: avisar quando a análise não pôde ser concluída.",
    data: {
      analysis_request_id: SAMPLE_ANALYSIS,
      reason_code: "extraction_failed",
    },
    fields: [
      analysisField,
      {
        name: "data.reason_code",
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
    subscribable: false,
    hasConnection: true,
    description:
      "Proposta: avisar quando a análise segue para conferência da equipe.",
    data: { analysis_request_id: SAMPLE_ANALYSIS },
    fields: [analysisField],
    source: "docs/partner-connection-blueprint.md:35",
  },
  {
    type: "payment.received",
    title: "Pagamento recebido",
    status: "proposed",
    subscribable: false,
    hasConnection: true,
    description: "Proposta: avisar quando o PIX do titular é confirmado.",
    data: { analysis_request_id: SAMPLE_ANALYSIS, amount_cents: 1990 },
    fields: [
      analysisField,
      {
        name: "data.amount_cents",
        type: "inteiro",
        description: "Valor pago em centavos.",
      },
    ],
    source: "docs/partner-connection-blueprint.md:35",
  },
  {
    type: "connection.revoked",
    title: "Conexão revogada",
    status: "proposed",
    subscribable: false,
    hasConnection: true,
    description:
      "Proposta: avisar quando o titular revoga o acesso da aplicação.",
    data: {},
    fields: [],
    source: "docs/partner-connection-blueprint.md:35",
  },
];

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  return value;
}

/** Compact JSON, sorted keys at every depth, non-ASCII escaped as Python's json.dumps does. */
export function canonicalBody(envelope: {
  id: string;
  event: string;
  occurredAt: string;
  applicationId: string;
  connectionId: string | null;
  data: Record<string, unknown>;
}): string {
  return JSON.stringify(
    sortKeys({
      id: envelope.id,
      event: envelope.event,
      version: 1,
      occurred_at: envelope.occurredAt,
      application_id: envelope.applicationId,
      connection_id: envelope.connectionId,
      data: envelope.data,
    }),
  ).replace(
    /[\u007f-￿]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** HMAC-SHA256 hex digest over "<timestamp>.<body>" (the value after `sha256=`). */
export async function signBody(
  secret: string,
  timestamp: string,
  body: string,
): Promise<string> {
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
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const SAMPLE_EVENT_ID = "0192a8c0-0000-7000-8000-000000000001";
export const SAMPLE_OCCURRED_AT = "2026-10-23T12:00:00.123456Z";
export const SAMPLE_TIMESTAMP = "2026-10-23T12:00:01.000000+00:00";
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
  options: {
    id?: string;
    occurredAt?: string;
    applicationId?: string;
    connectionId?: string;
    analysisRequestId?: string;
    timestamp?: string;
    keyVersion?: number;
  } = {},
): Promise<SignedExample> {
  const id = options.id ?? SAMPLE_EVENT_ID;
  const timestamp = options.timestamp ?? SAMPLE_TIMESTAMP;
  const data =
    "analysis_request_id" in event.data && options.analysisRequestId
      ? { ...event.data, analysis_request_id: options.analysisRequestId }
      : event.data;
  const body = canonicalBody({
    id,
    event: event.type,
    occurredAt: options.occurredAt ?? SAMPLE_OCCURRED_AT,
    applicationId: options.applicationId ?? SAMPLE_APPLICATION,
    connectionId: event.hasConnection
      ? (options.connectionId ?? SAMPLE_CONNECTION)
      : null,
    data,
  });
  const digest = await signBody(secret, timestamp, body);
  return {
    headers: {
      "Content-Type": "application/json",
      "X-Aferis-Event-Id": id,
      "X-Aferis-Timestamp": timestamp,
      "X-Aferis-Key-Version": String(options.keyVersion ?? 1),
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
// carimbo: o cabeçalho X-Aferis-Timestamp, tal como veio
export function assinaturaValida(rawBody, carimbo, cabecalho, segredo) {
  const assinado = Buffer.concat([Buffer.from(carimbo + "."), rawBody]);
  const esperado = "sha256=" + createHmac("sha256", segredo).update(assinado).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(cabecalho ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}
// Recomendado: rejeite o evento se o carimbo estiver muito distante da hora atual
// (por exemplo, mais de 5 minutos) para barrar repetições antigas.`;

export const pythonVerifySnippet = `import hashlib
import hmac

def assinatura_valida(raw_body: bytes, carimbo: str, cabecalho: str, segredo: str) -> bool:
    # raw_body: os bytes exatos recebidos (não reserialize o JSON)
    # carimbo: o cabeçalho X-Aferis-Timestamp, tal como veio
    assinado = carimbo.encode("ascii") + b"." + raw_body
    esperado = "sha256=" + hmac.new(segredo.encode("ascii"), assinado, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, cabecalho or "")
# Recomendado: rejeite o evento se o carimbo estiver muito distante da hora atual
# (por exemplo, mais de 5 minutos) para barrar repetições antigas.`;
