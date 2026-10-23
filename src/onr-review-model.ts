export type PortalOrder = { protocol: string; date: string; status: string };

export type ReviewVersion = {
  id: string;
  version: number;
  decision: string;
  reason: string;
  portal_orders_sha256: string;
  observed_at: string;
  actor_team_member_id: string;
  previous_review_id: string | null;
};

export type ReviewDecision =
  "inconclusive" | "draft_absent" | "draft_present" | "purchase_suspected";

/** Human observations only; none of them reopens the preview, buys or charges. */
export const DECISION_OPTIONS: {
  value: ReviewDecision;
  label: string;
  summary: string;
}[] = [
  {
    value: "inconclusive",
    label: "Inconclusivo",
    summary: "Não dá para afirmar o estado do pedido. É a escolha segura.",
  },
  {
    value: "draft_absent",
    label: "Rascunho não localizado",
    summary:
      "Conferi no portal e não há pedido em rascunho para esta tentativa.",
  },
  {
    value: "draft_present",
    label: "Rascunho localizado",
    summary: "Conferi no portal e há um pedido em rascunho desta tentativa.",
  },
  {
    value: "purchase_suspected",
    label: "Compra sob suspeita",
    summary: "Há indício de cobrança, mas sem certeza.",
  },
];

const COVERAGE: Record<string, string> = {
  observed_pages_only: "Todas as páginas lidas até a última disponível",
  visible_page_only: "Só a página visível, sem paginação reconhecida",
};

export const coverageLabel = (coverage: string) =>
  COVERAGE[coverage] ?? coverage;

export const shortSha = (sha: string) =>
  sha.length > 14 ? `${sha.slice(0, 8)}…${sha.slice(-4)}` : sha;

export const shortId = (id: string) => id.slice(0, 8);

/** The status is the portal's own wording; it is shown as it came. */
export const portalStatusText = (status: string) => status.trim() || "—";

const norm = (text: string) => text.trim().toLowerCase();

export function filterOrders(
  orders: PortalOrder[],
  query: string,
): PortalOrder[] {
  const q = norm(query);
  if (!q) return orders;
  return orders.filter((order) =>
    [order.protocol, order.date, order.status].some((field) =>
      norm(field).includes(q),
    ),
  );
}

/** Highest version, which is what a correction must point to. */
export function latestReviewId(items: ReviewVersion[]): string | null {
  if (items.length === 0) return null;
  return items.reduce((best, item) =>
    item.version > best.version ? item : best,
  ).id;
}

export function historyView(items: ReviewVersion[], currentSha: string) {
  const newest = Math.max(0, ...items.map((item) => item.version));
  return [...items]
    .sort((a, b) => b.version - a.version)
    .map((item) => ({
      ...item,
      current: item.version === newest,
      sameListing: item.portal_orders_sha256 === currentSha,
    }));
}
