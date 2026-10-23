import { useEffect, useState } from "react";
import {
  ApiError,
  listAnalysisAttention,
  listTeamAnalysisRequests,
  type AttentionPage,
  type RequestOperationPage,
} from "./api";
import { AnalysisReview } from "./AnalysisReview";
import { SourceClassification } from "./SourceClassification";
import { analysisWorkStatusLabel, statusLabel } from "./display-labels";
import "./review.css";

type Tab = "requests" | "classify" | "review" | "attention";

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.detail
    : "Não foi possível consultar a API agora.";
}

function docStateBadge(state: string): string {
  if (state === "available") return "badge-green";
  if (state === "purged") return "badge-red";
  return "badge-gray";
}

function attentionBadge(status: string): string {
  if (status === "failed") return "badge-red";
  if (status === "unknown") return "badge-yellow";
  if (status === "completed") return "badge-blue";
  return "badge-gray";
}

function short(id: string): string {
  return id.slice(0, 8);
}

export function Analyses({
  csrf,
  canReview,
  onUnauthorized,
  initialWorkId,
}: {
  csrf: string;
  canReview: boolean;
  onUnauthorized: () => void;
  initialWorkId?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialWorkId ? "review" : "requests");

  const [requests, setRequests] = useState<RequestOperationPage | null>(null);
  const [requestsError, setRequestsError] = useState("");
  const [requestsBusy, setRequestsBusy] = useState(false);

  const [attention, setAttention] = useState<AttentionPage | null>(null);
  const [attentionError, setAttentionError] = useState("");
  const [attentionBusy, setAttentionBusy] = useState(false);

  useEffect(() => {
    if (tab !== "requests") return;
    let live = true;
    setRequestsBusy(true);
    setRequestsError("");
    listTeamAnalysisRequests()
      .then((page) => {
        if (!live) return;
        setRequests(page);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setRequestsError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setRequestsBusy(false);
      });
    return () => {
      live = false;
    };
  }, [tab, onUnauthorized]);

  useEffect(() => {
    if (tab !== "attention" || !canReview) return;
    let live = true;
    setAttentionBusy(true);
    setAttentionError("");
    listAnalysisAttention()
      .then((page) => {
        if (!live) return;
        setAttention(page);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setAttentionError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setAttentionBusy(false);
      });
    return () => {
      live = false;
    };
  }, [tab, canReview, onUnauthorized]);

  async function moreRequests() {
    if (!requests?.next_cursor) return;
    setRequestsBusy(true);
    setRequestsError("");
    try {
      const page = await listTeamAnalysisRequests(requests.next_cursor);
      setRequests((prev) =>
        prev
          ? {
              items: [...prev.items, ...page.items],
              next_cursor: page.next_cursor,
            }
          : page,
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setRequestsError(errorMessage(cause));
    } finally {
      setRequestsBusy(false);
    }
  }

  async function moreAttention() {
    if (!attention?.next_cursor) return;
    setAttentionBusy(true);
    setAttentionError("");
    try {
      const page = await listAnalysisAttention(attention.next_cursor);
      setAttention((prev) =>
        prev
          ? {
              items: [...prev.items, ...page.items],
              next_cursor: page.next_cursor,
            }
          : page,
      );
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setAttentionError(errorMessage(cause));
    } finally {
      setAttentionBusy(false);
    }
  }

  const tabs: { id: Tab; label: string; restricted?: boolean }[] = [
    { id: "requests", label: "Pedidos" },
    { id: "classify", label: "Classificar fonte", restricted: true },
    { id: "review", label: "Revisar análise", restricted: true },
    { id: "attention", label: "Atenção", restricted: true },
  ];

  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Conferência interna</p>
          <h1>Análises</h1>
          <p className="muted">
            Pedidos, classificação de fonte, revisão humana e itens de atenção.
          </p>
        </div>
        <span className="pill">{canReview ? "Gestão" : "Leitura"}</span>
      </header>
      <div className="analyses-tabs" aria-label="Áreas de análise">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`button ${tab === t.id ? "primary" : "secondary"}`}
            disabled={t.restricted && !canReview}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <section>
          {requestsError && (
            <p className="error" role="alert">
              {requestsError}
            </p>
          )}
          {!requests && !requestsError && (
            <div
              className="skeleton-rows"
              role="status"
              aria-label="Carregando pedidos"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: "2.5rem", marginBottom: "0.5rem" }}
                />
              ))}
            </div>
          )}
          {requests && (
            <>
              {requests.items.length === 0 ? (
                <p className="analyses-empty" role="status">
                  Nenhum pedido encontrado.
                </p>
              ) : (
                <div className="analyses-table-wrap">
                  <table className="analyses-table analyses-mobile-cards">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Págs</th>
                        <th>Documento</th>
                        <th>Pagamento</th>
                        <th>Trabalho</th>
                        <th>Criado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.items.map((item) => (
                        <tr key={item.request_id}>
                          <td data-label="ID">
                            <code title={item.request_id}>
                              {short(item.request_id)}
                            </code>
                          </td>
                          <td data-label="Págs">{item.page_count}</td>
                          <td data-label="Documento">
                            <span
                              className={docStateBadge(item.document_state)}
                            >
                              {statusLabel(item.document_state)}
                            </span>
                          </td>
                          <td data-label="Pagamento">
                            {item.payment_status
                              ? statusLabel(item.payment_status)
                              : "—"}
                          </td>
                          <td data-label="Trabalho">
                            <span className="analyses-work-cell">
                              {item.work_id ? (
                                <code title={item.work_id}>
                                  {short(item.work_id)}
                                </code>
                              ) : (
                                "—"
                              )}
                              {item.work_status && (
                                <span className="analyses-work-status">
                                  {analysisWorkStatusLabel(item.work_status)}
                                </span>
                              )}
                            </span>
                          </td>
                          <td data-label="Criado em">
                            {new Date(item.created_at).toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {requests.next_cursor && (
                <button
                  type="button"
                  className="button secondary"
                  style={{ marginTop: "1rem" }}
                  disabled={requestsBusy}
                  onClick={() => void moreRequests()}
                >
                  Mais
                </button>
              )}
            </>
          )}
        </section>
      )}

      {tab === "classify" && (
        <SourceClassification
          csrf={csrf}
          canClassify={canReview}
          onUnauthorized={onUnauthorized}
        />
      )}

      {tab === "review" && (
        <AnalysisReview
          csrf={csrf}
          canReview={canReview}
          onUnauthorized={onUnauthorized}
          initialWorkId={initialWorkId}
        />
      )}

      {tab === "attention" && (
        <section>
          {!canReview && (
            <p className="muted">Seu papel não permite ver itens de atenção.</p>
          )}
          {canReview && (
            <>
              {attentionError && (
                <p className="error" role="alert">
                  {attentionError}
                </p>
              )}
              {!attention && !attentionError && (
                <div
                  className="skeleton-rows"
                  role="status"
                  aria-label="Carregando atenção"
                >
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: "2.5rem", marginBottom: "0.5rem" }}
                    />
                  ))}
                </div>
              )}
              {attention && (
                <>
                  {attention.items.length === 0 ? (
                    <p className="analyses-empty" role="status">
                      Nenhum item de atenção.
                    </p>
                  ) : (
                    <div className="analyses-table-wrap">
                      <table className="analyses-table analyses-mobile-cards">
                        <thead>
                          <tr>
                            <th>Trabalho</th>
                            <th>Pedido</th>
                            <th>Status</th>
                            <th>Código de erro</th>
                            <th>Finalizado em</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attention.items.map((item) => (
                            <tr key={item.work_id}>
                              <td data-label="Trabalho">
                                <code title={item.work_id}>
                                  {short(item.work_id)}
                                </code>
                              </td>
                              <td data-label="Pedido">
                                <code title={item.request_id}>
                                  {short(item.request_id)}
                                </code>
                              </td>
                              <td data-label="Status">
                                <span className={attentionBadge(item.status)}>
                                  {analysisWorkStatusLabel(item.status)}
                                </span>
                              </td>
                              <td data-label="Código de erro">
                                {item.error_code ? "Falha registrada" : "—"}
                              </td>
                              <td data-label="Finalizado em">
                                {item.finished_at
                                  ? new Date(item.finished_at).toLocaleString(
                                      "pt-BR",
                                    )
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {attention.next_cursor && (
                    <button
                      type="button"
                      className="button secondary"
                      style={{ marginTop: "1rem" }}
                      disabled={attentionBusy}
                      onClick={() => void moreAttention()}
                    >
                      Mais
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
