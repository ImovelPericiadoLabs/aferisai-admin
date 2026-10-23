/**
 * SAMPLE DATA ONLY. These numbers do not come from the API; they exist so the
 * planned partner metrics and commission statement can be reviewed visually
 * before the backend provides them (see docs/implementation/permission-map.md).
 */
export const SAMPLE_LABEL = "Dados de exemplo — não vêm da API";

export const sampleKpis = [
  {
    label: "Análises originadas",
    value: 128,
    hint: "Pelas aplicações do parceiro",
  },
  { label: "Conexões ativas", value: 41, hint: "Titulares conectados" },
  {
    label: "Sucesso do webhook",
    value: 97,
    suffix: "%",
    hint: "Entregues entre as decididas",
  },
  {
    label: "Latência p95",
    value: 640,
    suffix: " ms",
    hint: "Entrega do webhook",
  },
];

export const sampleFunnel = [
  { label: "Resgates do cupom", value: 86 },
  { label: "Cotações pagas", value: 52 },
  { label: "Análises concluídas", value: 49 },
];

export const sampleCommission = {
  totals: [
    { key: "provisional", label: "Provisória", cents: 18_450 },
    { key: "owed", label: "Devida", cents: 42_900 },
    { key: "settled", label: "Paga", cents: 126_300 },
    { key: "reversed", label: "Estornada", cents: 2_200 },
  ],
  items: [
    {
      id: "ex-1",
      at: "2026-10-21",
      kind: "Análise concluída",
      status: "owed",
      cents: 1_450,
    },
    {
      id: "ex-2",
      at: "2026-10-20",
      kind: "Análise concluída",
      status: "provisional",
      cents: 1_450,
    },
    {
      id: "ex-3",
      at: "2026-10-12",
      kind: "Análise concluída",
      status: "settled",
      cents: 1_450,
    },
    {
      id: "ex-4",
      at: "2026-10-09",
      kind: "Análise concluída",
      status: "reversed",
      cents: 1_450,
    },
  ],
} as const;

export const statusText: Record<string, string> = {
  provisional: "Provisória",
  owed: "Devida",
  settled: "Paga",
  reversed: "Estornada",
};
