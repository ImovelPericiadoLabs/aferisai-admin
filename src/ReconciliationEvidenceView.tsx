import type { SupplierEvidence } from "./api";
import { dateTime } from "./reconciliation-format";
import { SupplierResponseTree } from "./SupplierResponseTree";

export function ReconciliationEvidenceView({
  evidence,
}: {
  evidence: SupplierEvidence;
}) {
  return (
    <div className="ops-evidence-stack">
      <h4>Resposta da tentativa</h4>
      {evidence.response.captured &&
      evidence.response.response_text !== null ? (
        <>
          <p className="ops-hint">
            HTTP {evidence.response.http_status ?? "—"} ·{" "}
            {evidence.response.content_type ?? "tipo desconhecido"} · SHA-256{" "}
            {evidence.response.response_sha256 ?? "—"}
          </p>
          <SupplierResponseTree text={evidence.response.response_text} />
        </>
      ) : (
        <p className="ops-hint">
          A versão que executou esta tentativa não guardou o corpo da resposta.
          Não é possível reconstruí-lo agora.
        </p>
      )}
      <h4>Lista atual da InfoSimples</h4>
      {evidence.order_list.status === "checked" ? (
        <>
          <p className="ops-hint">
            Consultada em{" "}
            {evidence.order_list.checked_at
              ? dateTime.format(new Date(evidence.order_list.checked_at))
              : "agora"}
            . {evidence.order_list.listed_count} pedidos na primeira página;
            mais recente em{" "}
            {evidence.order_list.newest_date ?? "data indisponível"}.
          </p>
          {evidence.order_list.matching_orders.length ? (
            <table className="ops-evidence-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {evidence.order_list.matching_orders.map((order) => (
                  <tr key={order.protocol}>
                    <td>{order.protocol}</td>
                    <td>{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="ops-hint">
              Nenhum pedido correspondente apareceu nesta página.
            </p>
          )}
        </>
      ) : (
        <p className="ops-hint">
          Lista:{" "}
          {evidence.order_list.status === "account_changed"
            ? "a conta ativa mudou"
            : evidence.order_list.status === "unavailable"
              ? "fornecedor indisponível"
              : "não se aplica"}
          .
        </p>
      )}
      <p className="ops-hint">{evidence.order_list.limit_note}</p>
    </div>
  );
}
