import type {
  ExecutiveReports,
  OrganizationRevenue,
  RevenueDay,
  RevenueSlice,
  RevenueTotals,
} from "./executive-contract";
import type { Period } from "./executive-model";

export const SAMPLE_LABEL = "Dados de exemplo";

/** Deterministic pseudo-random numbers, so a period always shows the same sample. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (text: string) =>
  [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

function dates(from: string, days: number): string[] {
  const start = new Date(`${from}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

type Product = {
  key: string;
  source: string;
  price: number;
  cost: number;
  share: number;
};

// Illustrative prices and costs, not the company's real table.
const PRODUCTS: Product[] = [
  {
    key: "analise_upload",
    source: "upload",
    price: 7900,
    cost: 1200,
    share: 0.58,
  },
  {
    key: "visualizacao",
    source: "number",
    price: 4900,
    cost: 1800,
    share: 0.14,
  },
  {
    key: "inteiro_teor_simples",
    source: "cnm",
    price: 12900,
    cost: 5200,
    share: 0.17,
  },
  {
    key: "inteiro_teor",
    source: "address",
    price: 18900,
    cost: 8200,
    share: 0.11,
  },
];

const CHANNELS = [
  { key: "site", share: 0.64, commissionBps: 0 },
  { key: "integration", share: 0.26, commissionBps: 1000 },
  { key: "promotion", share: 0.1, commissionBps: 1500 },
];

const PARTNERS = [
  "Cartório Exemplo Alfa",
  "Imobiliária Exemplo Beta",
  "Banco Exemplo Gama",
  "Escritório Exemplo Delta",
  "Construtora Exemplo Épsilon",
  "Advocacia Exemplo Zeta",
  "Fintech Exemplo Eta",
  "Seguradora Exemplo Theta",
];

const WEEKDAY = [0.42, 1.05, 1.15, 1.1, 1.08, 0.95, 0.55]; // Sunday first

function pick<T extends { share: number }>(items: T[], r: number): T {
  let acc = 0;
  for (const item of items) {
    acc += item.share;
    if (r < acc) return item;
  }
  return items[items.length - 1];
}

type Sales = {
  totals: RevenueTotals;
  series: RevenueDay[];
  byChannel: Map<string, RevenueSlice>;
  bySource: Map<string, RevenueSlice>;
  byProduct: Map<string, RevenueSlice>;
  byOrganization: Map<number, OrganizationRevenue>;
};

function simulate(from: string, days: number, scale: number): Sales {
  const byChannel = new Map<string, RevenueSlice>();
  const bySource = new Map<string, RevenueSlice>();
  const byProduct = new Map<string, RevenueSlice>();
  const byOrganization = new Map<number, OrganizationRevenue>();
  const totals: RevenueTotals = {
    gross_cents: 0,
    fees_cents: 0,
    tax_cents: 0,
    commission_cents: 0,
    refund_cents: 0,
    net_cents: 0,
    contribution_cents: 0,
    intents_received: 0,
    avg_ticket_cents: 0,
  };
  const series: RevenueDay[] = [];

  const add = (
    map: Map<string, RevenueSlice>,
    key: string,
    gross: number,
    contribution: number,
  ) => {
    const slice = map.get(key) ?? {
      key,
      gross_cents: 0,
      contribution_cents: 0,
      intents: 0,
    };
    slice.gross_cents += gross;
    slice.contribution_cents += contribution;
    slice.intents += 1;
    map.set(key, slice);
  };

  dates(from, days).forEach((date, dayIndex) => {
    const random = mulberry32(hash(date));
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const trend = 1 + dayIndex * 0.004;
    const count = Math.max(
      3,
      Math.round(
        30 * scale * WEEKDAY[weekday] * trend * (0.85 + random() * 0.3),
      ),
    );
    const day: RevenueDay = {
      date,
      gross_cents: 0,
      contribution_cents: 0,
      intents: count,
    };
    for (let i = 0; i < count; i += 1) {
      const product = pick(PRODUCTS, random());
      const channel = pick(CHANNELS, random());
      const price = product.price;
      const fee = 99 + Math.round(price * 0.015);
      const tax = Math.round(price * 0.06);
      const commission = Math.round((price * channel.commissionBps) / 10000);
      const refund = random() < 0.015 ? price : 0;
      const contribution = price - product.cost - fee - tax - commission;
      totals.gross_cents += price;
      totals.fees_cents += fee;
      totals.tax_cents += tax;
      totals.commission_cents += commission;
      totals.refund_cents += refund;
      totals.contribution_cents += contribution;
      day.gross_cents += price;
      day.contribution_cents += contribution;
      add(byChannel, channel.key, price, contribution);
      add(bySource, product.source, price, contribution);
      add(byProduct, product.key, price, contribution);
      if (channel.commissionBps > 0) {
        const index = Math.min(
          PARTNERS.length - 1,
          Math.floor(random() ** 1.7 * PARTNERS.length),
        );
        const org =
          byOrganization.get(index) ??
          ({
            organization_id: `exemplo-${index + 1}`,
            name: PARTNERS[index],
            slug: `exemplo-${index + 1}`,
            logo_url: null,
            gross_cents: 0,
            commission_cents: 0,
            intents: 0,
          } satisfies OrganizationRevenue);
        org.gross_cents += price;
        org.commission_cents += commission;
        org.intents += 1;
        byOrganization.set(index, org);
      }
    }
    totals.intents_received += count;
    series.push(day);
  });

  totals.net_cents =
    totals.gross_cents -
    totals.fees_cents -
    totals.tax_cents -
    totals.commission_cents -
    totals.refund_cents;
  totals.avg_ticket_cents = Math.round(
    totals.gross_cents / Math.max(1, totals.intents_received),
  );
  return { totals, series, byChannel, bySource, byProduct, byOrganization };
}

const sorted = (map: Map<string, RevenueSlice>) =>
  [...map.values()].sort((a, b) => b.gross_cents - a.gross_cents);

export function buildSampleReports(
  period: Period,
  compare: boolean,
): ExecutiveReports {
  const current = simulate(period.from, period.days, 1);
  const previous = compare
    ? simulate(period.previousFrom, period.days, 0.88)
    : null;
  const paid = current.totals.intents_received;
  const pix = Math.round(paid / 0.82);
  const quoted = Math.round(pix / 0.55);
  const requests = Math.round(quoted / 0.8);
  const stepsFor = (p: number) => {
    const px = Math.round(p / 0.82);
    const q = Math.round(px / 0.55);
    return [
      { key: "requests" as const, count: Math.round(q / 0.8) },
      { key: "quoted" as const, count: q },
      { key: "pix_created" as const, count: px },
      { key: "paid" as const, count: p },
      { key: "delivered" as const, count: Math.round(p * 0.96) },
    ];
  };
  const random = mulberry32(hash(`${period.from}:${period.to}`));
  const owed = Math.round(current.totals.commission_cents * 0.34);
  const settled = Math.round(current.totals.commission_cents * 0.52);
  const top = [...current.byOrganization.values()]
    .sort((a, b) => b.gross_cents - a.gross_cents)
    .slice(0, 10);

  return {
    revenue: {
      timezone: "America/Sao_Paulo",
      from: period.from,
      to: period.to,
      totals: current.totals,
      ...(previous
        ? { previous: previous.totals, previous_series: previous.series }
        : {}),
      series: current.series,
      by_channel: sorted(current.byChannel),
      by_source: sorted(current.bySource),
      by_product: sorted(current.byProduct),
      top_organizations: top,
    },
    funnel: {
      steps: [
        { key: "requests", count: requests },
        { key: "quoted", count: quoted },
        { key: "pix_created", count: pix },
        { key: "paid", count: paid },
        { key: "delivered", count: Math.round(paid * 0.96) },
      ],
      ...(previous
        ? { previous: stepsFor(previous.totals.intents_received) }
        : {}),
    },
    fulfillment: {
      group_by: "provider",
      groups: [
        {
          key: "ia_upload",
          completed: Math.round(paid * 0.58 * 0.97),
          failed: Math.round(paid * 0.58 * 0.02),
          unknown: Math.round(paid * 0.58 * 0.01),
          p50_seconds: 190,
          p95_seconds: 640,
        },
        {
          key: "onr",
          completed: Math.round(paid * 0.24 * 0.93),
          failed: Math.round(paid * 0.24 * 0.05),
          unknown: Math.round(paid * 0.24 * 0.02),
          p50_seconds: 3600 * 2 + 600,
          p95_seconds: 3600 * 9,
        },
        {
          key: "infosimples",
          completed: Math.round(paid * 0.18 * 0.95),
          failed: Math.round(paid * 0.18 * 0.04),
          unknown: Math.round(paid * 0.18 * 0.01),
          p50_seconds: 1500,
          p95_seconds: 5400,
        },
      ],
    },
    commissions: {
      totals: {
        provisional_cents:
          current.totals.commission_cents - owed - settled - 4200,
        owed_cents: owed,
        settled_cents: settled,
        reversed_cents: 4200,
      },
      by_organization: top.slice(0, 6).map((org) => ({
        organization_id: org.organization_id,
        name: org.name,
        owed_cents: Math.round(org.commission_cents * 0.34),
        settled_cents: Math.round(org.commission_cents * 0.52),
      })),
    },
    exceptions: {
      open: 9,
      overdue: 3,
      due_in_24h: 2,
      amount_open_cents: 9 * 7900 + 3 * 4900,
      refunded_cents: current.totals.refund_cents,
      avg_resolution_hours: 31.5,
    },
    ai: {
      group_by: "model",
      groups: [
        {
          key: "modelo-a",
          calls: Math.round(paid * 0.58 * 6.2),
          failed: Math.round(paid * 0.58 * 0.18),
          input_tokens: Math.round(paid * 0.58 * 41_000),
          output_tokens: Math.round(paid * 0.58 * 5_800),
          avg_latency_ms: 18_400 + Math.round(random() * 600),
        },
        {
          key: "modelo-b",
          calls: Math.round(paid * 0.58 * 1.4),
          failed: Math.round(paid * 0.58 * 0.07),
          input_tokens: Math.round(paid * 0.58 * 9_000),
          output_tokens: Math.round(paid * 0.58 * 1_100),
          avg_latency_ms: 7_900,
        },
      ],
    },
    webhooks: {
      attempts: Math.round(paid * 0.26 * 2.1),
      delivered: Math.round(paid * 0.26 * 2.1 * 0.955),
      failed: Math.round(paid * 0.26 * 2.1 * 0.04),
      p50_ms: 268,
      p95_ms: 1520,
      worst_applications: [
        {
          application_id: "exemplo-app-1",
          name: "Aplicação exemplo 1",
          failure_rate_bps: 910,
        },
        {
          application_id: "exemplo-app-2",
          name: "Aplicação exemplo 2",
          failure_rate_bps: 420,
        },
      ],
    },
  };
}
