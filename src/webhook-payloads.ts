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

type BackendEventCatalogItem = {
  type: string;
  version: number;
  subscribable: boolean;
  json_schema: Record<string, unknown>;
  example: Record<string, unknown>;
};

const EVENT_COPY: Record<string, { title: string; description: string }> = {
  "analysis.created": {
    title: "Análise criada",
    description:
      "Enviado quando uma análise iniciada pela sua aplicação é criada.",
  },
  "analysis.completed": {
    title: "Análise concluída",
    description:
      "Enviado quando uma análise iniciada pela sua aplicação termina.",
  },
  "analysis.failed": {
    title: "Análise com falha",
    description: "Enviado quando uma análise termina com falha durável.",
  },
  "analysis.review_required": {
    title: "Análise em revisão humana",
    description: "Enviado quando uma análise precisa de revisão da equipe.",
  },
  "webhook.test": {
    title: "Teste de integração",
    description:
      "Evento fictício assinado pelo botão de teste; não cria análise nem cobrança.",
  },
};

function jsonType(schema: Record<string, unknown>): string {
  const type = schema.type;
  if (type === "integer") return "inteiro";
  if (type === "boolean") return "booleano";
  if (type === "string" && schema.format === "uuid") return "UUIDv7";
  if (type === "string") return "texto";
  return typeof type === "string" ? type : "objeto";
}

/** Convert the backend source-of-truth catalog into the documentation model. */
export function eventDefinitionFromBackend(
  item: BackendEventCatalogItem,
): EventDefinition {
  const data = (item.example.data ?? {}) as Record<string, unknown>;
  const dataSchema = ((item.json_schema.properties as Record<string, unknown> | undefined)
    ?.data as Record<string, unknown> | undefined) ?? {};
  const properties = (dataSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const copy = EVENT_COPY[item.type] ?? {
    title: item.type,
    description: `Evento ${item.type} publicado pelo catálogo da AferisAI.`,
  };
  return {
    type: item.type,
    title: copy.title,
    status: "implemented",
    subscribable: item.subscribable,
    hasConnection: item.example.connection_id !== null,
    description: copy.description,
    data,
    fields: Object.keys(data).map((name) => ({
      name: `data.${name}`,
      type: jsonType(properties[name] ?? {}),
      description: `Campo ${name} do evento ${item.type}.`,
    })),
    source: `catálogo do backend · v${item.version}`,
  };
}

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
    status: "implemented",
    subscribable: true,
    hasConnection: true,
    description: "Enviado quando a análise termina com falha durável.",
    data: { analysis_request_id: SAMPLE_ANALYSIS },
    fields: [analysisField],
    source: "app/integrations/webhook_events.py:40",
  },
  {
    type: "analysis.review_required",
    title: "Análise em revisão humana",
    status: "implemented",
    subscribable: true,
    hasConnection: true,
    description:
      "Enviado quando a análise precisa de revisão da equipe.",
    data: { analysis_request_id: SAMPLE_ANALYSIS },
    fields: [analysisField],
    source: "app/integrations/webhook_events.py:45",
  },
  {
    type: "payment.confirmed",
    title: "Pagamento confirmado",
    status: "implemented",
    subscribable: true,
    hasConnection: true,
    description: "Enviado quando um pagamento ligado à aplicação é confirmado.",
    data: { resource_type: "payment", resource_id: SAMPLE_ANALYSIS, status: "confirmed" },
    fields: [
      { name: "data.resource_type", type: "texto", description: "Tipo do recurso relacionado." },
      { name: "data.resource_id", type: "UUIDv7", description: "Identificador do recurso relacionado." },
      { name: "data.status", type: "texto", description: "Estado do pagamento." },
    ],
    source: "app/integrations/webhook_events.py:80",
  },
  {
    type: "connection.revoked",
    title: "Conexão revogada",
    status: "implemented",
    subscribable: true,
    hasConnection: true,
    description:
      "Enviado quando o titular revoga o acesso da aplicação.",
    data: {},
    fields: [],
    source: "app/integrations/webhook_events.py:124",
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
