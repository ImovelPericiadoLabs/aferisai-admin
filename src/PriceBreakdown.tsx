import { breakdownLines } from "./account-model";
import { termsRows } from "./AccountOverview";
import { Hint } from "./SupplierUi";
import { explainContext, explainPart } from "./price-explain";
import { date, money } from "./price-composition-model";
import type { RegistryCommercialTerms, RegistryHistoricalPrice } from "./api";

const LINE_TONE: Record<string, string> = {
  cost: "cost",
  markup: "gain",
  api: "api",
  analysis: "rest",
  operations: "rest",
  exception: "rest",
  payment: "fee",
  tax: "tax",
  contribution: "gain",
};

export function Breakdown({
  item,
  terms,
}: {
  item: RegistryHistoricalPrice;
  terms: RegistryCommercialTerms | null;
}) {
  const parts = item.breakdown ?? null;
  if (!parts)
    return (
      <p className="sup-muted sup-pad">
        Este cartório não tem simulação de preço com a oferta e as tarifas
        atuais.
      </p>
    );
  const { lines, warning } = breakdownLines(parts);
  const ctx = explainContext(terms, parts);
  return (
    <div className="sup-breakdown">
      <div className="sup-breakdown-main">
        <div className="sup-stack" role="img" aria-label="Composição do preço">
          {lines
            .filter((line) => line.cents > 0)
            .map((line) => (
              <span
                key={line.id}
                data-tone={LINE_TONE[line.id]}
                style={{ width: `${line.shareBps / 100}%` }}
                title={`${line.label}: ${money(line.cents)}`}
              />
            ))}
        </div>
        <table className="sup-table sup-table-compact">
          <thead>
            <tr>
              <th>Parte do preço</th>
              <th className="sup-table-end">Valor</th>
              <th className="sup-table-end">% do preço</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <span
                    className="sup-dot"
                    data-tone={LINE_TONE[line.id]}
                    aria-hidden="true"
                  />
                  <Hint {...explainPart(line.id, ctx)}>{line.label}</Hint>
                </td>
                <td className="sup-table-end">{money(line.cents)}</td>
                <td className="sup-table-end">
                  {(line.shareBps / 100).toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Preço indicativo</td>
              <td className="sup-table-end">{money(parts.price_cents)}</td>
              <td className="sup-table-end">100,0%</td>
            </tr>
          </tfoot>
        </table>
        {warning && (
          <p className="alert alert-warning" role="alert">
            {warning}
          </p>
        )}
        <p className="sup-muted">
          Fórmula {parts.formula_version} · custo cru observado em{" "}
          {date.format(new Date(parts.observed_at))} · fonte {parts.cost_source}
          .
        </p>
      </div>
      <aside className="sup-breakdown-side" aria-label="Condições aplicadas">
        <h4>Condições aplicadas</h4>
        {terms ? (
          <dl className="sup-kv sup-kv-compact">
            {termsRows(terms).map((row) => (
              <div key={row.label}>
                <dt>
                  <Hint {...explainPart(row.part, ctx)}>{row.label}</Hint>
                </dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="sup-muted">Sem condições comerciais vigentes.</p>
        )}
      </aside>
    </div>
  );
}
