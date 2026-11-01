import type { ExecutiveReports } from "./executive-contract";
import { keyLabel, rateBps, successBps } from "./executive-model";
import { NUM, bps, count, duration, text, type Table } from "./report-cells";

export function fornecedores(data: ExecutiveReports): Table[] {
  return [
    {
      id: "entrega",
      title: "Entrega por fornecedor",
      note: "Resultado incerto conta como não concluído.",
      columns: [
        { label: "Fornecedor" },
        { label: "Concluídos", ...NUM },
        { label: "Falhas", ...NUM },
        { label: "Incertos", ...NUM },
        { label: "Taxa de sucesso", ...NUM },
        { label: "Mediana", ...NUM },
        { label: "P95", ...NUM },
      ],
      rows: data.fulfillment.groups.map((g) => [
        text(keyLabel(g.key)),
        count(g.completed),
        count(g.failed),
        count(g.unknown),
        bps(successBps(g)),
        duration(g.p50_seconds),
        duration(g.p95_seconds),
      ]),
    },
    {
      id: "ia",
      title: "Uso de IA por modelo",
      note: "O custo em reais por chamada depende de um preço por modelo ainda não definido.",
      columns: [
        { label: "Modelo" },
        { label: "Chamadas", ...NUM },
        { label: "Falhas", ...NUM },
        { label: "Taxa de falha", ...NUM },
        { label: "Tokens de entrada", ...NUM },
        { label: "Tokens de saída", ...NUM },
        { label: "Latência média", ...NUM },
      ],
      rows: data.ai.groups.map((g) => [
        text(g.key),
        count(g.calls),
        count(g.failed),
        bps(rateBps(g.failed, g.calls)),
        count(g.input_tokens),
        count(g.output_tokens),
        duration(g.avg_latency_ms === null ? null : g.avg_latency_ms / 1000),
      ]),
    },
  ];
}

export function integracoes(data: ExecutiveReports): Table[] {
  const w = data.webhooks;
  return [
    {
      id: "webhooks",
      title: "Entrega de webhooks",
      columns: [{ label: "Indicador" }, { label: "Valor", ...NUM }],
      rows: [
        [text("Tentativas"), count(w.attempts)],
        [text("Entregues"), count(w.delivered)],
        [text("Falhas"), count(w.failed)],
        [text("Taxa de entrega"), bps(rateBps(w.delivered, w.attempts))],
        [
          text("Latência mediana"),
          duration(w.p50_ms === null ? null : w.p50_ms / 1000),
        ],
        [
          text("Latência p95"),
          duration(w.p95_ms === null ? null : w.p95_ms / 1000),
        ],
      ],
    },
    {
      id: "piores",
      title: "Aplicações com mais falhas",
      columns: [{ label: "Aplicação" }, { label: "Taxa de falha", ...NUM }],
      rows: w.worst_applications.map((a) => [
        text(a.name),
        bps(a.failure_rate_bps),
      ]),
    },
  ];
}
