import { describe, expect, it } from "vitest";
import {
  endpointId,
  endpointRows,
  endpointSection,
  type Endpoint,
} from "./api-reference";

const sample: Endpoint = {
  method: "POST",
  path: "/v1/partner/analyses/{analysis_id}/quotes",
  title: "Cotar o arquivo",
  scope: "analysis:quote",
  purpose: "Aprova o preço do arquivo.",
  headers: [["Idempotency-Key", "UUIDv7 novo para cada operação."]],
  body: {
    caption: "Corpo",
    fields: [["promotion_code", "texto", "não", "Cupom opcional."]],
  },
  response: {
    status: "201",
    text: "A cotação aprovada.",
    fields: [["amount_cents", "Preço final em centavos."]],
  },
  errors: [["404", "A análise não é desta aplicação."]],
  example: { label: "cURL", language: "shell", code: "curl …" },
  notes: ["Não cria PIX."],
  events: ["analysis.created"],
};

describe("endpointId", () => {
  it("makes a stable anchor from method and path", () => {
    expect(endpointId(sample)).toBe("post-analyses-analysis-id-quotes");
    expect(
      endpointId({ method: "GET", path: "/oauth/authorize" } as Endpoint),
    ).toBe("get-oauth-authorize");
  });
});

describe("endpointSection", () => {
  const section = endpointSection(sample);

  it("is titled by what it does and anchored by its route", () => {
    expect(section.id).toBe("post-analyses-analysis-id-quotes");
    expect(section.title).toBe("Cotar o arquivo");
  });

  it("opens with the route, scope and purpose", () => {
    const first = section.blocks[0];
    expect(first).toMatchObject({
      type: "code",
      language: "http",
      label: "Rota",
    });
    expect(JSON.stringify(section.blocks)).toContain("analysis:quote");
    expect(JSON.stringify(section.blocks)).toContain(
      "Aprova o preço do arquivo.",
    );
  });

  it("documents headers, body, response, errors, notes and events", () => {
    const text = JSON.stringify(section.blocks);
    for (const expected of [
      "Idempotency-Key",
      "promotion_code",
      "amount_cents",
      "201",
      "A análise não é desta aplicação.",
      "Não cria PIX.",
      "analysis.created",
      "curl …",
    ])
      expect(text).toContain(expected);
  });

  it("leaves out sections an endpoint does not have", () => {
    const small = endpointSection({
      method: "GET",
      path: "/v1/partner/analyses",
      title: "Listar análises",
      scope: "analysis:read",
      purpose: "Lista.",
      response: { status: "200", text: "Página." },
      errors: [["401", "Token inválido."]],
    });
    const tables = small.blocks.filter((b) => b.type === "table");
    expect(tables.map((t) => (t.type === "table" ? t.caption : ""))).toEqual([
      "Erros",
    ]);
  });

  it("builds one tabular row per endpoint for the summary table", () => {
    expect(endpointRows([sample])).toEqual([
      [
        "`POST /v1/partner/analyses/{analysis_id}/quotes`",
        "`analysis:quote`",
        "Cotar o arquivo",
      ],
    ]);
  });
});
