import type { EventField } from "./webhook-payloads";

/** Event families, in the order they are listed. The id is the event name's prefix. */
export const EVENT_GROUPS = [
  { id: "analysis", label: "Análises" },
  { id: "registry", label: "Registro de imóveis" },
  { id: "payment", label: "Pagamentos" },
  { id: "acquisition", label: "Aquisições" },
  { id: "certificate", label: "Certidões" },
  { id: "connection", label: "Conexões" },
  { id: "credential", label: "Credenciais" },
  { id: "commission", label: "Comissões" },
  { id: "webhook", label: "Teste de integração" },
  { id: "other", label: "Outros" },
] as const;

export type EventGroupId = (typeof EVENT_GROUPS)[number]["id"];

export function eventGroupOf(type: string): EventGroupId {
  const prefix = type.includes(".") ? type.split(".", 1)[0] : "";
  const known = EVENT_GROUPS.find((group) => group.id === prefix);
  return known ? known.id : "other";
}

const plain = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export type EventGroup<T> = { id: EventGroupId; label: string; events: T[] };

/** Events filtered by name or title (case and accents ignored), grouped in documented order. */
export function groupEvents<T extends { type: string; title: string }>(
  events: readonly T[],
  query: string,
): EventGroup<T>[] {
  const needle = plain(query);
  const matching = needle
    ? events.filter(
        (event) =>
          plain(event.type).includes(needle) ||
          plain(event.title).includes(needle),
      )
    : events;
  return EVENT_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    events: matching.filter((event) => eventGroupOf(event.type) === group.id),
  })).filter((group) => group.events.length > 0);
}

/** Roving-tabindex keyboard model for a horizontal tab list; null when the key is not ours. */
export function nextTabIndex(
  current: number,
  key: string,
  count: number,
): number | null {
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

type Schema = Record<string, unknown>;

const FIELD_COPY: Record<string, string> = {
  analysis_request_id: "Análise a que o evento se refere.",
  synthetic: "Presente e true somente em eventos fictícios.",
  message: "Mensagem fixa do teste.",
  resource_type: "Tipo do recurso relacionado ao evento.",
  resource_id: "Identificador do recurso relacionado.",
  status: "Estado do recurso, quando informado.",
  quote_id: "Cotação relacionada, quando houver.",
  payment_id: "Pagamento relacionado, quando houver.",
  certificate_code: "Código da certidão, quando houver.",
};

function resolve(schema: Schema, node: unknown): Schema | null {
  if (node === null || typeof node !== "object") return null;
  const ref = (node as Schema).$ref;
  if (typeof ref !== "string") return node as Schema;
  const name = ref.replace(/^#\/\$defs\//, "");
  const defs = (schema.$defs ?? {}) as Record<string, Schema>;
  return defs[name] ?? null;
}

function typeLabel(property: Schema): string {
  const options = Array.isArray(property.anyOf)
    ? (property.anyOf as Schema[])
    : [property];
  const nullable = options.some((option) => option.type === "null");
  const main = options.find((option) => option.type !== "null") ?? {};
  let label: string;
  if (main.type === "boolean" && main.const === true)
    label = "booleano (sempre true)";
  else if (main.type === "boolean") label = "booleano";
  else if (main.type === "integer") label = "inteiro";
  else if (main.type === "string" && main.format === "uuid") label = "UUID";
  else if (main.type === "string" && main.format === "date-time")
    label = "data ISO 8601";
  else if (main.type === "string")
    label =
      typeof main.maxLength === "number"
        ? `texto (até ${main.maxLength})`
        : "texto";
  else label = typeof main.type === "string" ? main.type : "objeto";
  return nullable ? `${label} ou nulo` : label;
}

/** The event-specific fields (inside `data`) described by the backend's JSON schema. */
export function fieldsFromSchema(schema: Schema): EventField[] {
  const properties = (schema.properties ?? {}) as Record<string, unknown>;
  const data = resolve(schema, properties.data);
  const fields = (data?.properties ?? null) as Record<string, Schema> | null;
  if (!fields) return [];
  const required = new Set(
    Array.isArray(data?.required) ? (data.required as string[]) : [],
  );
  return Object.entries(fields).map(([name, property]) => ({
    name: `data.${name}`,
    type: typeLabel(property),
    required: required.has(name),
    description: FIELD_COPY[name] ?? "Campo específico deste evento.",
  }));
}
