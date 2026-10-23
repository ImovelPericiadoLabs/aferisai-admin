import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getPartnerCommissions,
  type PartnerCommissionItem,
  type PartnerCommissionStatement,
} from "./api";
import { money } from "./commercial-model";
import {
  commissionKindLabel,
  commissionStatusView,
} from "./partner-finance-model";
import "./partner-finance.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function PartnerStatement({
  onUnauthorized,
}: {
  onUnauthorized: () => void;
}) {
  const [totals, setTotals] = useState<
    PartnerCommissionStatement["totals"] | null
  >(null);
  const [items, setItems] = useState<PartnerCommissionItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (next?: string) => {
      try {
        const page = await getPartnerCommissions(next);
        setTotals(page.totals);
        setItems((current) =>
          next ? [...current, ...page.items] : page.items,
        );
        setCursor(page.next_cursor);
        setFailed("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setFailed(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar o extrato.",
          );
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <section className="pf" aria-labelledby="pf-statement-title">
      <div>
        <h2 className="appws-section-title" id="pf-statement-title">
          Extrato de comissões
        </h2>
        <p className="pf-note">
          Totais do histórico inteiro. Não mostra pagador, documento nem dados
          bancários.
        </p>
      </div>

      {failed ? (
        <div className="alert alert-danger" role="alert">
          {failed}{" "}
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : loading || !totals ? (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando extrato"
        >
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : (
        <>
          <dl className="pf-kpis">
            <div className="pf-kpi" data-emphasis="true">
              <dt>A repassar</dt>
              <dd>{money(totals.owed_cents)}</dd>
              <small>Saldo exigível ainda não repassado</small>
            </div>
            <div className="pf-kpi">
              <dt>Provisória</dt>
              <dd>{money(totals.provisional_cents)}</dd>
              <small>Ainda depende de conclusão</small>
            </div>
            <div className="pf-kpi">
              <dt>Repassada</dt>
              <dd>{money(totals.settled_cents)}</dd>
              <small>Com repasse comprovado</small>
            </div>
            <div className="pf-kpi">
              <dt>Estornada</dt>
              <dd>{money(totals.reversed_cents)}</dd>
              <small>Obrigações canceladas</small>
            </div>
          </dl>

          {items.length === 0 ? (
            <div className="empty-state" role="status">
              <strong>Nenhuma comissão registrada</strong>
              <span>
                As comissões aparecem aqui quando uma análise ou pedido
                originado pela parceria é concluído.
              </span>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table
                className="data-table pf-table"
                aria-label="Itens do extrato"
              >
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Repasse</th>
                    <th scope="col">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const status = commissionStatusView(item.status);
                    return (
                      <tr key={item.id}>
                        <td data-label="Data">
                          {dateTime.format(new Date(item.created_at))}
                        </td>
                        <td data-label="Origem">
                          {commissionKindLabel(item.item_kind)}
                        </td>
                        <td data-label="Estado">
                          <span className={`badge badge-${status.tone}`}>
                            {status.label}
                          </span>
                        </td>
                        <td data-label="Repasse">
                          {item.settled_at
                            ? dateTime.format(new Date(item.settled_at))
                            : "—"}
                        </td>
                        <td data-label="Valor">{money(item.amount_cents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {cursor && (
            <div>
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => void load(cursor)}
              >
                Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
