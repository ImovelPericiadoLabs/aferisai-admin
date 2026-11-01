import type { OperationsOverview } from "./api";
import { statusLabel } from "./display-labels";
import { money } from "./operations-format";

export function OperationsPools({
  pools,
}: {
  pools: OperationsOverview["pools"];
}) {
  return (
    <section className="ops-section" aria-labelledby="ops-pools-title">
      <div className="ops-section-heading">
        <div>
          <h2 id="ops-pools-title">Capacidade compartilhada</h2>
          <p>Limites observados, uso atual e reservas para outros projetos.</p>
        </div>
      </div>
      {pools.length === 0 ? (
        <p>Não há grupos de capacidade cadastrados.</p>
      ) : (
        <div className="ops-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Limite</th>
                <th>Reservado fora</th>
                <th>Em andamento</th>
                <th>Disponível</th>
                <th>Esperas 24h</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => (
                <tr key={pool.pool_key}>
                  <th scope="row">{pool.pool_key}</th>
                  <td>{pool.observed_limit}</td>
                  <td>{pool.external_reserved}</td>
                  <td>
                    {pool.in_flight}
                    {pool.unknown > 0 && (
                      <small> · {pool.unknown} incerta(s)</small>
                    )}
                  </td>
                  <td>{pool.available}</td>
                  <td>{pool.waits_in_window}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function OperationsAccounts({
  accounts,
}: {
  accounts: OperationsOverview["accounts"];
}) {
  return (
    <section className="ops-section" aria-labelledby="ops-accounts-title">
      <div className="ops-section-heading">
        <div>
          <h2 id="ops-accounts-title">Contas de análise</h2>
          <p>
            O custo inclui valor apurado e reserva de chamadas ainda abertas.
          </p>
        </div>
      </div>
      {accounts.length === 0 ? (
        <p>Não há contas cadastradas.</p>
      ) : (
        <div className="ops-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Conta e modelo</th>
                <th>Estado</th>
                <th>Chamadas hoje</th>
                <th>Teto diário</th>
                <th>Custo ou reserva hoje</th>
                <th>Teto de custo</th>
                <th>Esperas 24h</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.account_id}>
                  <th scope="row">
                    {account.label}
                    <small>{account.model}</small>
                  </th>
                  <td>{statusLabel(account.status)}</td>
                  <td>
                    {account.calls_today}
                    {account.unpriced_calls_today > 0 && (
                      <small> · {account.unpriced_calls_today} sem preço</small>
                    )}
                  </td>
                  <td>{account.daily_limit}</td>
                  <td>{money(account.cost_cents_today)}</td>
                  <td>{money(account.daily_cost_limit_cents)}</td>
                  <td>{account.waits_in_window}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function OperationsProviderErrors({
  errors,
}: {
  errors: OperationsOverview["provider_errors"];
}) {
  return (
    <section className="ops-section" aria-labelledby="ops-errors-title">
      <div className="ops-section-heading">
        <div>
          <h2 id="ops-errors-title">Erros de IA</h2>
          <p>
            Códigos seguros das últimas 24 horas, sem resposta bruta nem
            documento de cliente.
          </p>
        </div>
      </div>
      {errors.length === 0 ? (
        <p>Não houve erro de provedor registrado na janela.</p>
      ) : (
        <div className="ops-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Ocorrências</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((item) => (
                <tr key={item.code}>
                  <th scope="row">
                    <code>{item.code}</code>
                  </th>
                  <td>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
