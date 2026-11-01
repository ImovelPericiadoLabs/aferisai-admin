import { dateTime } from "./reconciliation-format";
import type { UncertainRow } from "./reconciliation-model";

export function ReconciliationFacts({ selected }: { selected: UncertainRow }) {
  return (
    <section className="detail-panel-section">
      <h3 className="detail-panel-section-title">O que aconteceu</h3>
      <p className="ops-lead">
        O envio ao fornecedor foi tentado, mas a resposta não permitiu concluir
        se a compra ocorreu. Nada é reenviado automaticamente:
        {selected.customer_refunded
          ? " o cliente já foi reembolsado. Este registro não admite decisão de compra nem nova cobrança. Uma eventual despesa do fornecedor é tratada separadamente."
          : " a decisão abaixo é a única forma de liberar o item."}
      </p>
      <dl className="ops-facts">
        <div>
          <dt>Operação</dt>
          <dd>
            <code>{selected.operation_id}</code>
          </dd>
        </div>
        <div>
          <dt>Item</dt>
          <dd>
            <code>{selected.item_id}</code>
          </dd>
        </div>
        <div>
          <dt>Fornecedor</dt>
          <dd>{selected.provider}</dd>
        </div>
        <div>
          <dt>Criado em</dt>
          <dd>{dateTime.format(new Date(selected.created_at))}</dd>
        </div>
      </dl>
    </section>
  );
}

export function ReconciliationStatusBadge({
  selected,
}: {
  selected: UncertainRow;
}) {
  return (
    <span
      className={`badge ${selected.customer_refunded ? "badge-neutral" : "badge-warning"}`}
    >
      {selected.customer_refunded
        ? "Reembolsado · registro técnico"
        : "Resultado incerto"}
    </span>
  );
}
