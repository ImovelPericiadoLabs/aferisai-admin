import { FunnelChart, RankedBars, SegmentedBar } from "./ExecutiveCharts";
import type { ExecutiveReports } from "./executive-contract";
import {
  BREAKDOWNS,
  number,
  type Breakdown,
} from "./executive-dashboard-model";
import {
  formatBRL,
  formatPercentBps,
  keyLabel,
  rateBps,
  type ConversionStep,
} from "./executive-model";
import { OrganizationAvatar } from "./OrganizationAvatar";
import { Section } from "./ExecutiveParts";

export function ExecutiveFunnelSections({
  revenue,
  steps,
  breakdown,
  onBreakdown,
}: {
  revenue: ExecutiveReports["revenue"];
  steps: ConversionStep[];
  breakdown: Breakdown;
  onBreakdown: (breakdown: Breakdown) => void;
}) {
  return (
    <div className="xe-grid-2">
      <Section
        id="xe-funnel"
        title="Funil de conversão"
        description="Do pedido à entrega, no período."
      >
        <FunnelChart rows={steps} />
        <p className="xe-sub xe-note">
          Cada etapa conta os eventos que aconteceram dentro do período, pela
          data da própria etapa. Não é uma coorte: um pedido criado antes pode
          ser pago ou entregue agora.
        </p>
      </Section>
      <Section
        id="xe-breakdown"
        title="De onde vem a receita"
        description="Receita bruta no período."
      >
        <div className="seg" role="group" aria-label="Agrupar por">
          {BREAKDOWNS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="seg-item"
              aria-pressed={breakdown === item.id}
              onClick={() => onBreakdown(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <RankedBars
          label={`Receita por ${BREAKDOWNS.find((b) => b.id === breakdown)?.label.toLowerCase()}`}
          rows={revenue[breakdown].map((slice) => ({
            key: slice.key,
            label: keyLabel(slice.key),
            value: slice.gross_cents,
            display: formatBRL(slice.gross_cents),
            hint: `${number.format(slice.intents)} pagamentos · margem ${formatPercentBps(rateBps(slice.contribution_cents, slice.gross_cents) ?? 0)}`,
          }))}
        />
      </Section>
    </div>
  );
}

export function ExecutivePartnerSections({ data }: { data: ExecutiveReports }) {
  const { revenue } = data;
  return (
    <div className="xe-grid-2">
      <Section
        id="xe-partners"
        title="Parceiros"
        description="Maiores receitas vindas de integrações, cupons e links."
      >
        <div className="data-table-wrap">
          <table
            className="data-table xe-table"
            aria-label="Receita por parceiro"
          >
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Parceiro</th>
                <th scope="col">Receita</th>
                <th scope="col">Comissão</th>
                <th scope="col">Pagamentos</th>
              </tr>
            </thead>
            <tbody>
              {revenue.top_organizations.length === 0 && (
                <tr>
                  <td colSpan={5} className="xc-empty">
                    Sem vendas por parceiros no período.
                  </td>
                </tr>
              )}
              {revenue.top_organizations.map((org, index) => (
                <tr key={org.organization_id}>
                  <td data-label="#" className="xe-rank-cell">
                    {index + 1}
                  </td>
                  <td data-label="Parceiro" className="xe-title-cell">
                    <span className="xe-partner">
                      <OrganizationAvatar
                        id={org.organization_id}
                        name={org.name}
                        logoUrl={org.logo_url}
                      />
                      {org.name}
                    </span>
                  </td>
                  <td data-label="Receita">{formatBRL(org.gross_cents)}</td>
                  <td data-label="Comissão">
                    {formatBRL(org.commission_cents)}
                  </td>
                  <td data-label="Pagamentos">{number.format(org.intents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        id="xe-commissions"
        title="Comissões"
        description="Situação do que foi gerado para parceiros."
      >
        <SegmentedBar
          label="Comissões por situação"
          segments={[
            {
              key: "provisional",
              label: "Provisória",
              value: data.commissions.totals.provisional_cents,
              display: formatBRL(data.commissions.totals.provisional_cents),
              tone: "info",
            },
            {
              key: "owed",
              label: "A repassar",
              value: data.commissions.totals.owed_cents,
              display: formatBRL(data.commissions.totals.owed_cents),
              tone: "warning",
            },
            {
              key: "settled",
              label: "Repassada",
              value: data.commissions.totals.settled_cents,
              display: formatBRL(data.commissions.totals.settled_cents),
              tone: "success",
            },
            {
              key: "reversed",
              label: "Estornada",
              value: data.commissions.totals.reversed_cents,
              display: formatBRL(data.commissions.totals.reversed_cents),
              tone: "neutral",
            },
          ]}
        />
        <p className="xe-sub xe-note">
          Considera as comissões criadas no período, na situação de hoje. O
          histórico de situações anteriores não é reconstruído.
        </p>
        <h3 className="xe-h3">Maiores saldos a repassar</h3>
        <RankedBars
          label="Saldo a repassar por parceiro"
          tone="warning"
          rows={[...data.commissions.by_organization]
            .sort((a, b) => b.owed_cents - a.owed_cents)
            .slice(0, 5)
            .map((org) => ({
              key: org.organization_id,
              label: org.name,
              value: org.owed_cents,
              display: formatBRL(org.owed_cents),
            }))}
        />
      </Section>
    </div>
  );
}
