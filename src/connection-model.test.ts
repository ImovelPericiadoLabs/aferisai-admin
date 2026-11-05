import { describe, expect, it } from "vitest";
import { groupScopes, partnerLinks, shortId } from "./connection-model";

describe("groupScopes", () => {
  const groups = groupScopes([
    "events:payment",
    "analysis:pay",
    "registry:submit",
    "payment:read",
    "analysis:read",
    "certificate:read",
    "events:analysis",
  ]);

  it("agrupa por assunto, na ordem Análises, Registro, Pagamentos, Eventos", () => {
    expect(groups.map((g) => g.label)).toEqual([
      "Análises",
      "Pedidos de registro",
      "Pagamentos",
      "Eventos recebidos",
    ]);
  });

  it("usa o texto legível de cada permissão, sem repetir o código", () => {
    const analyses = groups[0]!;
    expect(analyses.items.map((i) => i.label)).toEqual([
      "Consultar análises",
      "Pagar análise por PIX",
    ]);
  });

  it("coloca certidões junto do registro", () => {
    expect(groups[1]!.items.map((i) => i.code).sort()).toEqual([
      "certificate:read",
      "registry:submit",
    ]);
  });

  it("não cria grupo vazio e junta o desconhecido em Outras", () => {
    expect(groupScopes([]).length).toBe(0);
    expect(groupScopes(["algo:novo"]).map((g) => g.label)).toEqual(["Outras"]);
  });
});

describe("shortId", () => {
  it("abrevia UUID mantendo início e fim", () => {
    expect(shortId("01a1a879-4812-7c59-b018-fa0d36bb3ede")).toBe(
      "01a1a879…3ede",
    );
  });
  it("não mexe em texto curto", () => {
    expect(shortId("abc")).toBe("abc");
  });
});

describe("partnerLinks", () => {
  it("devolve só endereços https válidos, com rótulo", () => {
    expect(
      partnerLinks({
        website_url: "https://exemplo.com.br",
        support_url: "http://inseguro.com",
        privacy_url: "javascript:alert(1)",
        terms_url: null,
      }),
    ).toEqual([{ label: "Site", href: "https://exemplo.com.br/" }]);
  });
  it("mantém a ordem Site, Suporte, Privacidade, Termos", () => {
    const links = partnerLinks({
      website_url: "https://a.com",
      support_url: "https://b.com",
      privacy_url: "https://c.com",
      terms_url: "https://d.com",
    });
    expect(links.map((l) => l.label)).toEqual([
      "Site",
      "Suporte",
      "Privacidade",
      "Termos",
    ]);
  });
  it("aceita ausência de perfil", () => {
    expect(partnerLinks(null)).toEqual([]);
  });
});
