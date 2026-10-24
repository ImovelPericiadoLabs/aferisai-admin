import type {
  OnrEndpoint,
  RegistryCommercialTerms,
  RegistryHistoricalPrice,
  RegistrySupplierAccount,
  RegistryVisualizationTariff,
} from "./api";
import { supplierTariffValidityLabel } from "./supplier-tariff-validity";

export type AccountSnapshot = {
  endpoint: OnrEndpoint | null;
  tariff: RegistryVisualizationTariff | null;
  terms: RegistryCommercialTerms | null;
  loading: boolean;
};

export type ReadinessState = "ok" | "warn" | "todo" | "loading";
export type ReadinessRow = {
  id: "status" | "credential" | "connection" | "tariff" | "terms";
  label: string;
  state: ReadinessState;
  detail: string;
  /** Section that fixes it. */
  section: "credentials" | "connection" | "tariffs" | "commercial" | null;
};

const HOUR = 3_600_000;

function remaining(
  validUntil: string,
  now: number,
): { ms: number; text: string } {
  const ms = Date.parse(validUntil) - now;
  if (ms <= 0) return { ms, text: "vencida" };
  if (ms < 48 * HOUR) return { ms, text: `${Math.floor(ms / HOUR)} h` };
  return { ms, text: `${Math.floor(ms / (24 * HOUR))} d` };
}

/** What stands between this account and being used to sell. */
export function readiness(
  account: RegistrySupplierAccount,
  snapshot: AccountSnapshot,
  now: number,
): ReadinessRow[] {
  const rows: ReadinessRow[] = [
    {
      id: "status",
      label: "Conta ativa",
      state: account.status === "active" ? "ok" : "warn",
      detail:
        account.status === "active"
          ? "Usada pelos pedidos deste fornecedor"
          : account.status === "draft"
            ? "Em rascunho: ainda não é usada"
            : "Suspensa: novas reservas bloqueadas",
      section: null,
    },
    {
      id: "credential",
      label: "Credencial no cofre",
      state: "ok",
      detail: `Cifrada · versão ${account.version}`,
      section: "credentials",
    },
  ];

  if (account.provider === "onr") {
    const endpoint = snapshot.endpoint;
    rows.push({
      id: "connection",
      label: "Conexão com o portal",
      state:
        snapshot.loading && !endpoint ? "loading" : endpoint ? "ok" : "todo",
      detail: endpoint
        ? endpoint.mode === "proxy"
          ? "Proxy protegido com chave no cofre"
          : "Portal original"
        : "Ainda não consultada",
      section: "connection",
    });
  }

  const tariff = snapshot.tariff;
  if (snapshot.loading && !tariff)
    rows.push({
      id: "tariff",
      label: "Tarifa da API vigente",
      state: "loading",
      detail: "Consultando…",
      section: "tariffs",
    });
  else if (!tariff)
    rows.push({
      id: "tariff",
      label: "Tarifa da API vigente",
      state: "todo",
      detail: "Nenhuma tarifa publicada",
      section: "tariffs",
    });
  else {
    const managed = tariff.valid_until.startsWith("9999-12-31");
    const left = remaining(tariff.valid_until, now);
    rows.push({
      id: "tariff",
      label: "Tarifa da API vigente",
      state: managed
        ? "ok"
        : left.ms <= 0
          ? "warn"
          : left.ms < 24 * HOUR
            ? "warn"
            : "ok",
      detail: managed
        ? supplierTariffValidityLabel(tariff.valid_until)
        : left.ms <= 0
          ? "Vencida: publique outra"
          : `Vale por mais ${left.text}`,
      section: "tariffs",
    });
  }

  if (account.provider === "onr") {
    const terms = snapshot.terms;
    if (snapshot.loading && !terms)
      rows.push({
        id: "terms",
        label: "Condições comerciais",
        state: "loading",
        detail: "Consultando…",
        section: "commercial",
      });
    else if (!terms)
      rows.push({
        id: "terms",
        label: "Condições comerciais",
        state: "todo",
        detail: "Sem oferta completa vigente",
        section: "commercial",
      });
    else {
      const left = remaining(terms.valid_until, now);
      rows.push({
        id: "terms",
        label: "Condições comerciais",
        state: left.ms <= 0 ? "warn" : "ok",
        detail:
          left.ms <= 0
            ? "Vencidas"
            : `${terms.version} · vale por mais ${left.text}`,
        section: "commercial",
      });
    }
  }
  return rows;
}

export type BreakdownLine = {
  id: "cost" | "api" | "payment" | "tax" | "contribution" | "remainder";
  label: string;
  cents: number;
  shareBps: number;
  /** Where the number comes from, so nothing looks invented. */
  source: "backend" | "calculated";
  note?: string;
};

export type Breakdown = {
  total: number | null;
  lines: BreakdownLine[];
  warning: string | null;
};

const bps = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 10000) : 0;

/**
 * The preview returns each component but not the reserves and margin; those are shown as the
 * difference to the indicative price, labelled as calculated.
 */
export function priceBreakdown(item: RegistryHistoricalPrice): Breakdown {
  const total = item.indicative_price_cents;
  if (total === null) return { total: null, lines: [], warning: null };
  const raw = item.observed_cost_cents ?? 0;
  const known: Omit<BreakdownLine, "shareBps">[] = [
    {
      id: "cost",
      label: "Custo do cartório (valor cru)",
      cents: raw,
      source: "backend",
      note:
        item.observed_cost_cents === null
          ? "Sem observação de custo para este cartório"
          : undefined,
    },
  ];
  if (item.indicative_api_fee_cents)
    known.push({
      id: "api",
      label: "Tarifa da API InfoSimples",
      cents: item.indicative_api_fee_cents,
      source: "backend",
    });
  known.push(
    {
      id: "payment",
      label: "Tarifa do PIX",
      cents: item.indicative_payment_fee_cents ?? 0,
      source: "backend",
    },
    {
      id: "tax",
      label: "Tributos",
      cents: item.indicative_tax_cents ?? 0,
      source: "backend",
    },
    {
      id: "contribution",
      label: "Contribuição",
      cents: item.indicative_contribution_cents ?? 0,
      source: "backend",
    },
  );
  const sum = known.reduce((acc, line) => acc + line.cents, 0);
  const remainder = total - sum;
  const lines: Omit<BreakdownLine, "shareBps">[] = [
    ...known,
    {
      id: "remainder",
      label: "Margem e reservas",
      cents: Math.max(0, remainder),
      source: "calculated",
      note: "Preço indicativo menos os itens acima",
    },
  ];
  return {
    total,
    lines: lines.map((line) => ({ ...line, shareBps: bps(line.cents, total) })),
    warning:
      remainder < 0
        ? "Os itens conhecidos somam mais que o preço indicativo. Confira a fórmula com o backend."
        : null,
  };
}
