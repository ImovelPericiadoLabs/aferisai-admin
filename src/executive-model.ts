import type {
  FunnelReport,
  FunnelStepKey,
  RevenueTotals,
} from "./executive-contract";

/** Windows the backend accepts (1 to 90 days); the screen offers these three. */
export const PRESETS = [7, 30, 90] as const;

const ZONE = "America/Sao_Paulo";

/** The calendar day in Brasília for an instant, as YYYY-MM-DD. */
export function saoPauloDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function addDays(date: string, days: number): string {
  const moment = new Date(`${date}T00:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
}

export type Period = {
  from: string;
  to: string;
  days: number;
  previousFrom: string;
  previousTo: string;
};

/** Inclusive window ending today (Brasília) and the equally long one right before it. */
export function periodFor(days: number, now: Date = new Date()): Period {
  const to = saoPauloDate(now);
  const from = addDays(to, -(days - 1));
  const previousTo = addDays(from, -1);
  return {
    from,
    to,
    days,
    previousFrom: addDays(previousTo, -(days - 1)),
    previousTo,
  };
}

const nbsp = / /g;

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
    .format(cents / 100)
    .replace(nbsp, " ");
}

export function formatCompactBRL(cents: number): string {
  const reais = cents / 100;
  const abs = Math.abs(reais);
  const one = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  if (abs >= 1_000_000) return `R$ ${one.format(reais / 1_000_000)} mi`;
  if (abs >= 1_000) return `R$ ${one.format(reais / 1_000)} mil`;
  return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(reais)}`;
}

export function formatPercentBps(bps: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bps / 100)}%`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  if (total < 3600) {
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

/** a over b in basis points, or null when there is nothing to divide by. */
export const rateBps = (a: number, b: number): number | null =>
  b === 0 ? null : Math.round((a / b) * 10000);

export const marginBps = (totals: RevenueTotals): number | null =>
  rateBps(totals.contribution_cents, totals.gross_cents);

/** Relative change in basis points, or null without a usable baseline. */
export function deltaBps(
  current: number,
  previous: number | undefined,
): number | null {
  if (previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 10000);
}

const STEP_LABELS: Record<FunnelStepKey, string> = {
  requests: "Pedidos",
  quoted: "Cotados",
  pix_created: "PIX gerado",
  paid: "Pagos",
  delivered: "Entregues",
};

export type ConversionStep = {
  key: FunnelStepKey;
  label: string;
  count: number;
  ofTopBps: number | null;
  ofPreviousBps: number | null;
};

export function conversionSteps(funnel: FunnelReport): ConversionStep[] {
  const top = funnel.steps[0]?.count ?? 0;
  return funnel.steps.map((step, index) => ({
    key: step.key,
    label: STEP_LABELS[step.key],
    count: step.count,
    ofTopBps: rateBps(step.count, top),
    ofPreviousBps:
      index === 0 ? null : rateBps(step.count, funnel.steps[index - 1].count),
  }));
}

export type KpiCard = {
  id:
    | "gross"
    | "net"
    | "margin"
    | "ticket"
    | "paid"
    | "conversion"
    | "delivery"
    | "owed";
  label: string;
  value: string;
  hint: string;
  deltaBps: number | null;
};

export function kpiCards(input: {
  revenue: RevenueTotals;
  previous: RevenueTotals | undefined;
  paidRatioBps: number | null;
  medianSeconds: number | null;
  owedCents: number;
}): KpiCard[] {
  const { revenue, previous } = input;
  const margin = marginBps(revenue);
  const previousMargin = previous ? marginBps(previous) : null;
  return [
    {
      id: "gross",
      label: "Receita bruta",
      value: formatBRL(revenue.gross_cents),
      hint: "Pagamentos confirmados no período",
      deltaBps: deltaBps(revenue.gross_cents, previous?.gross_cents),
    },
    {
      id: "net",
      label: "Receita líquida",
      value: formatBRL(revenue.net_cents),
      hint: "Depois de taxas, impostos, comissões e estornos",
      deltaBps: deltaBps(revenue.net_cents, previous?.net_cents),
    },
    {
      id: "margin",
      label: "Margem de contribuição",
      value: margin === null ? "—" : formatPercentBps(margin),
      hint: "Margem das cotações, sobre a receita bruta",
      deltaBps:
        margin === null || previousMargin === null
          ? null
          : deltaBps(margin, previousMargin),
    },
    {
      id: "ticket",
      label: "Ticket médio",
      value: formatBRL(revenue.avg_ticket_cents),
      hint: "Receita bruta por pagamento",
      deltaBps: deltaBps(revenue.avg_ticket_cents, previous?.avg_ticket_cents),
    },
    {
      id: "paid",
      label: "Pagamentos",
      value: new Intl.NumberFormat("pt-BR").format(revenue.intents_received),
      hint: "Cobranças PIX recebidas",
      deltaBps: deltaBps(revenue.intents_received, previous?.intents_received),
    },
    {
      id: "conversion",
      label: "Pedido até pagamento",
      value:
        input.paidRatioBps === null
          ? "—"
          : formatPercentBps(input.paidRatioBps),
      hint: "Pedidos criados que viraram pagamento",
      deltaBps: null,
    },
    {
      id: "delivery",
      label: "Tempo mediano de entrega",
      value: formatDuration(input.medianSeconds),
      hint: "Da criação à conclusão da análise",
      deltaBps: null,
    },
    {
      id: "owed",
      label: "Comissões a repassar",
      value: formatBRL(input.owedCents),
      hint: "Saldo exigível ainda não repassado",
      deltaBps: null,
    },
  ];
}

const KEY_LABELS: Record<string, string> = {
  site: "Site",
  integration: "Integração de parceiro",
  promotion: "Cupom ou link",
  upload: "Arquivo enviado",
  number: "Número da matrícula",
  cnm: "CNM",
  address: "Endereço",
  analise_upload: "Análise de arquivo",
  visualizacao: "Visualização",
  inteiro_teor_simples: "Inteiro teor simples",
  inteiro_teor: "Inteiro teor",
  ia_upload: "Análise por IA",
  onr: "RI Digital (ONR)",
  infosimples: "InfoSimples",
};

/** A readable name for a backend key; unknown keys are shown as they come. */
export const keyLabel = (key: string) => KEY_LABELS[key] ?? key;

/** Share of a group that ended well, in basis points (null without any record). */
export function successBps(group: {
  completed: number;
  failed: number;
  unknown: number;
}): number | null {
  return rateBps(
    group.completed,
    group.completed + group.failed + group.unknown,
  );
}
