import { Fragment, useState } from "react";
import {
  ApiError,
  getOnrOrderDetail,
  type OnrPortalOrderDetail,
  type OnrPortalOrdersInspection,
} from "./api";
import {
  coverageLabel,
  filterOrders,
  portalStatusText,
  shortSha,
} from "./onr-review-model";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
});

type Detail =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: OnrPortalOrderDetail };

export function OnrInspection({
  attemptId,
  inspection,
  onStale,
  onCopy,
}: {
  attemptId: string;
  inspection: OnrPortalOrdersInspection;
  /** The portal changed under the digest: the parent reloads the inspection. */
  onStale: () => void;
  onCopy: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const rows = filterOrders(inspection.orders, query);

  async function toggle(protocol: string) {
    if (open === protocol) {
      setOpen(null);
      return;
    }
    setOpen(protocol);
    if (details[protocol]?.state === "ready") return;
    setDetails((current) => ({ ...current, [protocol]: { state: "loading" } }));
    try {
      const data = await getOnrOrderDetail(
        attemptId,
        protocol,
        inspection.listing_sha256,
      );
      setDetails((current) => ({
        ...current,
        [protocol]: { state: "ready", data },
      }));
    } catch (cause) {
      const stale =
        cause instanceof ApiError &&
        (cause.status === 409 || cause.status === 422);
      setDetails((current) => ({
        ...current,
        [protocol]: {
          state: "error",
          message: stale
            ? "A listagem do portal mudou desde a leitura. Recarregue a inspeção."
            : cause instanceof ApiError
              ? cause.detail
              : "Não foi possível abrir o detalhe agora.",
        },
      }));
      if (stale) onStale();
    }
  }

  return (
    <section className="onr-rv-block" aria-labelledby="onr-orders-title">
      <div className="onr-rv-block-head">
        <h3 className="onr-rv-title" id="onr-orders-title">
          Pedidos do portal
        </h3>
        <span className="onr-rv-muted">
          {rows.length === inspection.orders.length
            ? `${inspection.orders.length} pedidos`
            : `${rows.length} de ${inspection.orders.length}`}
        </span>
      </div>

      <dl className="onr-rv-facts">
        <div>
          <dt>Lido em</dt>
          <dd>{dateTime.format(new Date(inspection.observed_at))}</dd>
        </div>
        <div>
          <dt>Páginas lidas</dt>
          <dd>{inspection.pages_read}</dd>
        </div>
        <div>
          <dt>Cobertura</dt>
          <dd>{coverageLabel(inspection.coverage)}</dd>
        </div>
        <div>
          <dt>SHA-256 da listagem</dt>
          <dd>
            <code title={inspection.listing_sha256}>
              {shortSha(inspection.listing_sha256)}
            </code>{" "}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onCopy(inspection.listing_sha256)}
            >
              Copiar
            </button>
          </dd>
        </div>
      </dl>

      <div className="alert alert-warning" role="note">
        <strong>Confira também no portal.</strong> Nenhuma linha é ligada
        automaticamente a esta tentativa, e a ausência de uma linha não prova
        que não existe pedido ou débito. Só escolha algo diferente de
        “Inconclusivo” depois de olhar o portal.
      </div>

      <div className="onr-rv-search">
        <label className="form-field-label" htmlFor="onr-search">
          Buscar por protocolo, data ou status
        </label>
        <input
          id="onr-search"
          className="input"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {inspection.orders.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhum pedido na listagem do portal</strong>
          <span>A leitura não encontrou linhas nas páginas observadas.</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>Nenhum pedido encontrado</strong>
          <span>Nada na listagem combina com a busca.</span>
        </div>
      ) : (
        <div className="data-table-wrap onr-rv-orders">
          <table
            className="data-table onr-rv-table"
            aria-label="Pedidos da listagem do portal"
          >
            <thead>
              <tr>
                <th scope="col">Protocolo</th>
                <th scope="col">Data</th>
                <th scope="col">Status no portal</th>
                <th scope="col">
                  <span className="sr-only">Detalhe</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const detail = details[order.protocol];
                return (
                  <Fragment key={order.protocol}>
                    <tr>
                      <td data-label="Protocolo">
                        <code>{order.protocol}</code>
                      </td>
                      <td data-label="Data">{order.date}</td>
                      <td data-label="Status no portal">
                        <span className="badge badge-neutral">
                          {portalStatusText(order.status)}
                        </span>
                      </td>
                      <td data-label="Detalhe">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          aria-expanded={open === order.protocol}
                          onClick={() => void toggle(order.protocol)}
                        >
                          {open === order.protocol ? "Ocultar" : "Ver detalhe"}
                        </button>
                      </td>
                    </tr>
                    {open === order.protocol && (
                      <tr className="onr-rv-detail-row">
                        <td colSpan={4}>
                          {!detail || detail.state === "loading" ? (
                            <p className="onr-rv-muted" role="status">
                              Abrindo o pedido no portal…
                            </p>
                          ) : detail.state === "error" ? (
                            <p className="alert alert-danger" role="alert">
                              {detail.message}
                            </p>
                          ) : detail.data.solicitations.length === 0 ? (
                            <p className="onr-rv-muted">
                              O pedido não tem solicitações listadas.
                            </p>
                          ) : (
                            <ul className="onr-rv-solicitations">
                              {detail.data.solicitations.map((item) => (
                                <li key={item.protocol}>
                                  <code>{item.protocol}</code>
                                  <span>{item.office}</span>
                                  <span>{item.product}</span>
                                  <span className="badge badge-neutral">
                                    {portalStatusText(item.status)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
