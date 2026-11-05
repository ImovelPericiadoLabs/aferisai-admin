import type { CodeLanguage } from "./code-highlight";
import type { Block, DocSection } from "./docs-model";

/**
 * One API operation, described once. The reference sections, the summary tables and the
 * coverage check all come from this data, so an endpoint cannot be documented in one place
 * and forgotten in another.
 */
export type Endpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  /** What a person does with it: "Cotar o arquivo", not the operation id. */
  title: string;
  /** Scope the token needs; null for public routes. */
  scope: string | null;
  purpose: string;
  /** Header name and what it carries. */
  headers?: [string, string][];
  /** Query parameters: name, type, required ("sim"/"não"), description. */
  query?: [string, string, string, string][];
  body?: { caption: string; fields: [string, string, string, string][] };
  response: {
    status: string;
    text: string;
    /** Field and what it means. */
    fields?: [string, string][];
  };
  /** Status and the cause the integrator can act on. */
  errors: [string, string][];
  notes?: string[];
  /** Webhook events this call can cause. */
  events?: string[];
  example?: { label: string; language: CodeLanguage; code: string };
};

export function endpointId(
  endpoint: Pick<Endpoint, "method" | "path">,
): string {
  const path = endpoint.path
    .replace(/^\/v1\/(partner\/)?/, "/")
    .replace(/[{}]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${endpoint.method.toLowerCase()}-${path}`;
}

const code = (text: string) => `\`${text}\``;

/** The reference section for one operation, in the same order every time. */
export function endpointSection(endpoint: Endpoint): DocSection {
  const blocks: Block[] = [
    {
      type: "code",
      language: "http",
      label: "Rota",
      code: `${endpoint.method} ${endpoint.path}`,
    },
    {
      type: "p",
      text: `**Escopo:** ${endpoint.scope ? code(endpoint.scope) : "nenhum (rota pública)"}. ${endpoint.purpose}`,
    },
  ];
  if (endpoint.headers?.length)
    blocks.push({
      type: "table",
      caption: "Cabeçalhos",
      columns: ["Cabeçalho", "O que enviar"],
      rows: endpoint.headers.map(([name, text]) => [code(name), text]),
    });
  if (endpoint.query?.length)
    blocks.push({
      type: "table",
      caption: "Parâmetros de consulta",
      columns: ["Parâmetro", "Tipo", "Obrigatório", "Descrição"],
      rows: endpoint.query.map(([name, type, required, text]) => [
        code(name),
        type,
        required,
        text,
      ]),
    });
  if (endpoint.body)
    blocks.push({
      type: "table",
      caption: endpoint.body.caption,
      columns: ["Campo", "Tipo", "Obrigatório", "Descrição"],
      rows: endpoint.body.fields.map(([name, type, required, text]) => [
        code(name),
        type,
        required,
        text,
      ]),
    });
  blocks.push({
    type: "p",
    text: `**Resposta ${code(endpoint.response.status)}.** ${endpoint.response.text}`,
  });
  if (endpoint.response.fields?.length)
    blocks.push({
      type: "table",
      caption: "Campos da resposta",
      columns: ["Campo", "O que significa"],
      rows: endpoint.response.fields.map(([name, text]) => [code(name), text]),
    });
  blocks.push({
    type: "table",
    caption: "Erros",
    columns: ["Status", "Quando acontece"],
    rows: endpoint.errors.map(([status, cause]) => [code(status), cause]),
  });
  if (endpoint.notes?.length)
    blocks.push({ type: "list", items: endpoint.notes });
  if (endpoint.events?.length)
    blocks.push({
      type: "p",
      text: `**Eventos que pode gerar:** ${endpoint.events.map(code).join(", ")}.`,
    });
  if (endpoint.example)
    blocks.push({
      type: "code",
      language: endpoint.example.language,
      label: endpoint.example.label,
      code: endpoint.example.code,
    });
  return { id: endpointId(endpoint), title: endpoint.title, blocks };
}

/** Rows for a "route, scope, what it does" summary table. */
export function endpointRows(endpoints: Endpoint[]): string[][] {
  return endpoints.map((endpoint) => [
    code(`${endpoint.method} ${endpoint.path}`),
    endpoint.scope ? code(endpoint.scope) : "público",
    endpoint.title,
  ]);
}
