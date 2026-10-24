import type {
  RegistryPriceBreakdown,
  RegistrySupplierAccount,
  SupplierAccountSummary,
} from "./api";

export type AccountSnapshot = {
  summary: SupplierAccountSummary | null;
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
const dateShort = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

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
  const data = snapshot.summary;
  const waiting = snapshot.loading && !data;
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
      detail: data?.last_credential_change_at
        ? `Cifrada · versão ${account.version} · trocada em ${dateShort.format(new Date(data.last_credential_change_at))}`
        : `Cifrada · versão ${account.version}`,
      section: "credentials",
    },
  ];

  if (account.provider === "onr") {
    const endpoint = data?.endpoint ?? null;
    rows.push({
      id: "connection",
      label: "Conexão com o portal",
      state: waiting ? "loading" : endpoint ? "ok" : "todo",
      detail: endpoint
        ? endpoint.mode === "proxy"
          ? endpoint.key_configured
            ? "Proxy protegido com chave no cofre"
            : "Proxy sem chave guardada"
          : "Portal original"
        : "Ainda não consultada",
      section: "connection",
    });
  }

  const tariff = data?.tariff ?? null;
  if (waiting)
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
  else if (tariff.managed || !tariff.valid_until)
    rows.push({
      id: "tariff",
      label: "Tarifa da API vigente",
      state: "ok",
      detail: "Vigente até atualização do gestor",
      section: "tariffs",
    });
  else {
    const left = remaining(tariff.valid_until, now);
    rows.push({
      id: "tariff",
      label: "Tarifa da API vigente",
      state: left.ms <= 0 || left.ms < 24 * HOUR ? "warn" : "ok",
      detail:
        left.ms <= 0 ? "Vencida: publique outra" : `Vale por mais ${left.text}`,
      section: "tariffs",
    });
  }

  if (account.provider === "onr") {
    const terms = data?.commercial_terms ?? null;
    if (waiting)
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
  id:
    | "cost"
    | "markup"
    | "api"
    | "analysis"
    | "operations"
    | "exception"
    | "payment"
    | "tax"
    | "contribution";
  label: string;
  cents: number;
  shareBps: number;
};

const bps = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 10000) : 0;

/** The official parts of one indicative price; they must close on the price. */
export function breakdownLines(parts: RegistryPriceBreakdown): {
  lines: BreakdownLine[];
  warning: string | null;
} {
  const raw: [BreakdownLine["id"], string, number, boolean][] = [
    [
      "cost",
      "Custo do cartório (valor cru)",
      parts.onr_record_cost_cents,
      true,
    ],
    ["markup", "Margem sobre o custo do ONR", parts.onr_markup_cents, false],
    ["api", "Tarifa da API InfoSimples", parts.api_fee_cents, false],
    ["analysis", "Reserva de IA", parts.analysis_reserve_cents, false],
    [
      "operations",
      "Reserva de operações",
      parts.operations_reserve_cents,
      false,
    ],
    [
      "exception",
      "Reserva para exceções",
      parts.exception_reserve_cents,
      false,
    ],
    ["payment", "Tarifa do PIX", parts.payment_fee_cents, false],
    ["tax", "Tributos", parts.tax_cents, false],
    ["contribution", "Contribuição residual", parts.contribution_cents, false],
  ];
  const lines = raw
    .filter(([, , cents, always]) => always || cents > 0)
    .map(([id, label, cents]) => ({
      id,
      label,
      cents,
      shareBps: bps(cents, parts.price_cents),
    }));
  const sum = raw.reduce((acc, [, , cents]) => acc + cents, 0);
  return {
    lines,
    warning:
      sum === parts.price_cents
        ? null
        : "As parcelas não fecham o preço informado. Confira a fórmula com o backend.",
  };
}

/** Change against the previous value, in basis points; null without a usable previous. */
export function changeRatio(
  current: number,
  previous: number | null,
): number | null {
  if (previous === null || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 10000);
}

const ACTIVITY_LABELS: Record<string, string> = {
  created: "Conta cadastrada",
  activated: "Conta ativada",
  suspended: "Conta suspensa",
  commercial_terms_published: "Condições comerciais publicadas",
  visualization_tariff_published: "Tarifa de visualização publicada",
  arisp_tariff_published: "Tarifa da API de certidão publicada",
  certificate_tariff_published: "Tarifa de certidão publicada",
  onr_endpoint_set: "Conexão com o portal alterada",
  onr_endpoint_reset: "Conexão voltou ao portal original",
};

export const activityLabel = (action: string) =>
  ACTIVITY_LABELS[action] ?? action;

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatValue(
  key: string,
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") {
    if (key.endsWith("_cents")) return brl.format(value / 100);
    if (key.endsWith("_bps"))
      return `${(value / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }
  return String(value);
}

export type DiffRow = { key: string; from: string; to: string };

/** What an event changed, ready to read; secrets never reach these maps. */
export function diffEntries(
  before: Record<string, string | number | boolean | null>,
  after: Record<string, string | number | boolean | null>,
): DiffRow[] {
  return Object.keys({ ...before, ...after })
    .filter((key) => before[key] !== after[key])
    .map((key) => ({
      key,
      from: formatValue(key, before[key]),
      to: formatValue(key, after[key]),
    }));
}

export type StepState = "done" | "current" | "todo";

/** Where the person is in a form: done steps, the first open one as current, the rest ahead. */
export function stepStates(complete: boolean[]): StepState[] {
  const firstOpen = complete.findIndex((done) => !done);
  return complete.map((done, index) =>
    done ? "done" : index === firstOpen ? "current" : "todo",
  );
}

const FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  mode: "Origem",
  key_configured: "Chave guardada",
  budget_cents: "Reserva da API",
  order_fee_cents: "Pedido",
  download_fee_cents: "Download",
  monthly_minimum_reserve_cents: "Mínimo mensal",
  unit_cost_cents: "Custo por chamada",
  onr_markup_bps: "Margem ONR",
  markup_bps: "Margem geral",
  tax_rate_bps: "Tributos",
  payment_fee_cents: "Tarifa PIX",
  payment_fee_rate_bps: "Tarifa PIX (%)",
  analysis_reserve_cents: "Reserva de IA",
  operations_reserve_cents: "Reserva de operações",
  exception_reserve_cents: "Reserva para exceções",
  minimum_contribution_cents: "Contribuição mínima",
  version: "Versão",
};

export const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key;
