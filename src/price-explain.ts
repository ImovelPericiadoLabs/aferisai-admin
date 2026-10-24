import type { RegistryCommercialTerms, RegistryPriceBreakdown } from "./api";

export type PartKey =
  | "cost"
  | "markup"
  | "api"
  | "analysis"
  | "operations"
  | "exception"
  | "payment"
  | "tax"
  | "contribution"
  | "markup_general"
  | "minimum_contribution";

export type ExplainContext = {
  /** Indicative price on screen, when there is one. */
  priceCents: number | null;
  /** The parts of that price, in cents, when the official breakdown is on screen. */
  parts: {
    cost: number;
    markup: number;
    api: number;
    analysis: number;
    operations: number;
    exception: number;
    payment: number;
    tax: number;
    contribution: number;
  } | null;
  terms: {
    onrMarkupBps: number;
    markupBps: number;
    taxRateBps: number;
    paymentFeeCents: number;
    paymentFeeRateBps: number;
    analysisReserveCents: number;
    operationsReserveCents: number;
    exceptionReserveCents: number;
    minimumContributionCents: number;
  } | null;
};

export type PartExplanation = { title: string; body: string; example: string };

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const money = (cents: number) => brl.format(cents / 100);
const pct = (bps: number) =>
  `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/**
 * Plain-language explanation of one part of the price, with an example built from the numbers
 * the person is looking at. Nothing here changes the price; it only explains it.
 */
export function explainPart(
  key: PartKey,
  ctx: ExplainContext,
): PartExplanation {
  const { parts, terms, priceCents } = ctx;
  const hundred = (cents: number) => money(cents * 100);

  switch (key) {
    case "cost": {
      const value = parts?.cost;
      return {
        title: "Custo do cartório (valor cru)",
        body: "É o que o cartório cobra pela matrícula, antes de qualquer acréscimo nosso. É o preço de “atacado” do documento.",
        example:
          value === undefined
            ? "Como o preço de etiqueta de uma mercadoria comprada do fornecedor, antes de somar margem e custos."
            : `O cartório cobra ${money(value)} por este documento. Esse valor é a base: todo o resto é somado em cima dele.`,
      };
    }
    case "markup": {
      const bps = terms?.onrMarkupBps;
      const cost = parts?.cost;
      const result = parts?.markup;
      return {
        title: "Margem sobre o custo do ONR",
        body: "É um percentual somado ao custo do cartório. Funciona como a margem de lucro de uma loja sobre o que pagou ao fornecedor.",
        example:
          bps !== undefined && cost !== undefined && result !== undefined
            ? `${pct(bps)} sobre ${money(cost)} = ${money(result)}. É como comprar por ${money(cost)} e acrescentar ${pct(bps)} de margem.`
            : "Com 50% de margem, um documento que custa R$ 100,00 ao cartório entra com R$ 50,00 de margem.",
      };
    }
    case "api":
      return {
        title: "Tarifa da API InfoSimples",
        body: "É o valor pago à InfoSimples para consultar e baixar o documento: um pedido mais até três downloads.",
        example:
          parts && parts.api > 0
            ? `Neste caso são ${money(parts.api)} por documento consultado.`
            : "Se o preço usa só o portal do RI Digital, essa parte não existe e some da conta.",
      };
    case "analysis": {
      const value = parts?.analysis ?? terms?.analysisReserveCents;
      return {
        title: "Reserva de IA",
        body: "É o dinheiro separado para pagar a inteligência artificial que lê e analisa cada documento.",
        example:
          value === undefined
            ? "Como guardar uma verba por documento para cobrir o “trabalhador” que lê o PDF página por página."
            : `${money(value)} ficam guardados por documento. Em 100 documentos, ${hundred(value)} ficam reservados para a IA.`,
      };
    }
    case "operations": {
      const value = parts?.operations ?? terms?.operationsReserveCents;
      return {
        title: "Reserva de operações",
        body: "Um colchão para os custos do dia a dia de rodar o serviço (servidor, suporte, acompanhamento), por pedido.",
        example:
          value === undefined
            ? "Como o rateio da conta de luz e do aluguel dividido por cada venda."
            : `${money(value)} por pedido. Em 100 pedidos, ${hundred(value)} ajudam a pagar a operação.`,
      };
    }
    case "exception": {
      const value = parts?.exception ?? terms?.exceptionReserveCents;
      return {
        title: "Reserva para exceções",
        body: "Dinheiro guardado para os imprevistos, como um pedido que precisa de correção ou de estorno.",
        example:
          value === undefined
            ? "Como o fundo de reserva do condomínio: ninguém quer usar, mas ele cobre o problema quando aparece."
            : `${money(value)} por pedido. Em 100 pedidos, ${hundred(value)} ficam guardados para cobrir problemas.`,
      };
    }
    case "payment": {
      const value = parts?.payment ?? terms?.paymentFeeCents;
      return {
        title: "Tarifa do PIX",
        body: "É o que o meio de pagamento cobra por receber o PIX. Sai do valor da venda.",
        example:
          value === undefined
            ? "Como a taxa da maquininha, descontada de cada venda."
            : `${money(value)} por cobrança recebida. Em 100 vendas, ${hundred(value)} vão para a tarifa do PIX.`,
      };
    }
    case "tax": {
      const rate = terms?.taxRateBps;
      const value = parts?.tax;
      if (rate !== undefined && value !== undefined && priceCents !== null)
        return {
          title: "Tributos",
          body: "É a parte do preço reservada para impostos sobre a venda.",
          example: `${pct(rate)} de ${money(priceCents)} = ${money(value)}. De cada R$ 100,00 vendidos, ${money(rate)} vão para impostos.`,
        };
      return {
        title: "Tributos",
        body: "É a parte do preço reservada para impostos sobre a venda.",
        example:
          rate === undefined
            ? "Em uma venda de R$ 100,00, uma reserva de 15% separa R$ 15,00 para impostos."
            : `Em uma venda de R$ 100,00, a reserva de ${pct(rate)} separa ${money(rate)} para impostos.`,
      };
    }
    case "contribution": {
      const value = parts?.contribution;
      return {
        title: "Contribuição residual",
        body: "É o que sobra depois de pagar o cartório, a API, a IA, as reservas, o PIX e os impostos. A margem sobre o ONR já foi contada à parte.",
        example:
          value !== undefined && priceCents !== null
            ? `Sobram ${money(value)}, ou ${pct(Math.round((value / priceCents) * 10000))} do preço, além da margem sobre o ONR.`
            : "É o “lucro livre” da venda depois de cobrir todos os custos e reservas.",
      };
    }
    case "markup_general": {
      const bps = terms?.markupBps;
      return {
        title: "Margem geral",
        body: "Acréscimo público sobre o custo total, aplicado antes de qualquer benefício como desconto ou cupom.",
        example:
          bps === undefined
            ? "Com 50%, uma base de custo de R$ 100,00 vira R$ 150,00 antes de descontos."
            : `Com ${pct(bps)}, uma base de custo de R$ 100,00 vira ${money(10000 + bps)} antes de descontos.`,
      };
    }
    case "minimum_contribution": {
      const value = terms?.minimumContributionCents;
      return {
        title: "Contribuição mínima",
        body: "É o piso da sobra de uma venda. Descontos e comissões só são aceitos se o preço ainda deixar pelo menos esse valor.",
        example:
          value === undefined
            ? "Como uma margem mínima combinada: abaixo dela, a oferta não é aprovada."
            : `Piso de ${money(value)}: se um cupom fizesse a venda sobrar menos que isso, ele não seria aceito.`,
      };
    }
  }
}

/** Builds the numbers an explanation can quote from what is on screen. */
export function explainContext(
  terms: RegistryCommercialTerms | null,
  breakdown: RegistryPriceBreakdown | null,
): ExplainContext {
  return {
    priceCents: breakdown?.price_cents ?? null,
    parts: breakdown
      ? {
          cost: breakdown.onr_record_cost_cents,
          markup: breakdown.onr_markup_cents,
          api: breakdown.api_fee_cents,
          analysis: breakdown.analysis_reserve_cents,
          operations: breakdown.operations_reserve_cents,
          exception: breakdown.exception_reserve_cents,
          payment: breakdown.payment_fee_cents,
          tax: breakdown.tax_cents,
          contribution: breakdown.contribution_cents,
        }
      : null,
    terms: terms
      ? {
          onrMarkupBps: terms.onr_markup_bps,
          markupBps: terms.markup_bps,
          taxRateBps: terms.tax_rate_bps,
          paymentFeeCents: terms.payment_fee_cents,
          paymentFeeRateBps: terms.payment_fee_rate_bps,
          analysisReserveCents: terms.analysis_reserve_cents,
          operationsReserveCents: terms.operations_reserve_cents,
          exceptionReserveCents: terms.exception_reserve_cents,
          minimumContributionCents: terms.minimum_contribution_cents,
        }
      : null,
  };
}
