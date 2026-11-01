import type {
  OrganizationRevenue,
  RevenueDay,
  RevenueSlice,
  RevenueTotals,
} from "./executive-contract";
import {
  CHANNELS,
  PARTNERS,
  PRODUCTS,
  WEEKDAY,
} from "./executive-fixture-data";

/** Deterministic pseudo-random numbers, so a period always shows the same sample. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hash = (text: string) =>
  [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

function dates(from: string, days: number): string[] {
  const start = new Date(`${from}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
function pick<T extends { share: number }>(items: T[], r: number): T {
  let acc = 0;
  for (const item of items) {
    acc += item.share;
    if (r < acc) return item;
  }
  return items[items.length - 1];
}

export type Sales = {
  totals: RevenueTotals;
  series: RevenueDay[];
  byChannel: Map<string, RevenueSlice>;
  bySource: Map<string, RevenueSlice>;
  byProduct: Map<string, RevenueSlice>;
  byOrganization: Map<number, OrganizationRevenue>;
};

export function simulate(from: string, days: number, scale: number): Sales {
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
