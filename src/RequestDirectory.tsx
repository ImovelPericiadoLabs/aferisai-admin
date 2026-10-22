import { useEffect, useState } from "react";
import {
  ApiError,
  listTeamAnalysisRequests,
  type RequestOperationPage,
} from "./api";
import "./request-directory.css";

type RequestItem = RequestOperationPage["items"][number];

const documentLabels = {
  available: "Original disponível",
  expired: "Original vencido",
  purged: "Original eliminado",
};

function paymentLabel(item: RequestItem): string {
  if (item.charge_attempt === "unknown") return "Cobrança em conciliação";
  if (item.payment_status === "received") return "Pagamento confirmado";
  if (item.payment_status === "review") return "Pagamento em conferência";
  if (item.payment_status === "prepared")
    return item.charge_attempt === "not_sent"
      ? "Cobrança ainda não enviada"
      : "Cobrança pendente";
  return "Sem intenção PIX";
}

function admissionLabel(item: RequestItem): string {
  const labels: Record<string, string> = {
    eligible: "Arquivo no limite técnico",
    unsupported: "Arquivo fora do limite técnico",
    non_registry: "Fonte fora da oferta",
  };
  return item.admission_outcome
    ? (labels[item.admission_outcome] ?? "Preflight em conferência")
    : "Preflight ausente";
}

function workLabel(item: RequestItem): string {
  const labels: Record<string, string> = {
    blocked: "Trabalho bloqueado",
    pending: "Na fila",
    running: "Em processamento",
    suspended: "Trabalho suspenso",
    unknown: "Resultado externo incerto",
    failed: "Falha de processamento",
    completed: "Processamento concluído",
  };
  return item.work_status
    ? (labels[item.work_status] ?? "Estado em conferência")
    : "Ainda sem trabalho";
}

export function RequestDirectory({
  canRead,
  onUnauthorized,
  openSource,
  openReview,
}: {
  canRead: boolean;
  onUnauthorized: () => void;
  openSource: (requestId: string) => void;
  openReview: (workId: string) => void;
}) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(cursor?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await listTeamAnalysisRequests(cursor);
      setItems((current) =>
        cursor ? [...current, ...result.items] : result.items,
      );
      setNextCursor(result.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível consultar os pedidos.",
        );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    let live = true;
    void listTeamAnalysisRequests()
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        setNextCursor(result.next_cursor);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar os pedidos.",
          );
      });
    return () => {
      live = false;
    };
  }, [canRead, onUnauthorized]);

  if (!canRead)
    return (
      <p className="error" role="alert">
        Este papel não pode consultar pedidos jurídicos.
      </p>
    );

  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Triagem operacional</p>
          <h1>Pedidos de análise</h1>
          <p className="muted">
            Acompanhe o original, o PIX e o trabalho por pedido. Cada ação
            confere o estado novamente.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void load()}
        >
          Atualizar
        </button>
      </header>
      <section className="request-directory" aria-label="Pedidos de análise">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!error && !loading && items.length === 0 && (
          <p className="directory-state">Nenhum pedido encontrado.</p>
        )}
        <ul>
          {items.map((item) => (
            <li key={item.request_id}>
              <div>
                <strong>Pedido nº {item.request_id.slice(-8)}</strong>
                <small>
                  {new Date(item.created_at).toLocaleString("pt-BR")} ·{" "}
                  {item.page_count}{" "}
                  {item.page_count === 1 ? "página" : "páginas"}
                </small>
                <small className="request-id">{item.request_id}</small>
              </div>
              <div className="request-states">
                <span
                  className={`badge ${item.document_state === "available" ? "badge-green" : item.document_state === "expired" ? "badge-yellow" : "badge-gray"}`}
                >
                  {documentLabels[item.document_state]}
                </span>
                <span className="badge badge-blue">{admissionLabel(item)}</span>
                <span
                  className={`badge ${item.payment_status === "received" ? "badge-green" : item.payment_status === "review" ? "badge-yellow" : item.charge_attempt === "unknown" ? "badge-yellow" : "badge-gray"}`}
                >
                  {paymentLabel(item)}
                </span>
                <span
                  className={`badge ${item.work_status === "completed" ? "badge-green" : item.work_status === "running" ? "badge-blue" : item.work_status === "failed" ? "badge-red" : item.work_status === "suspended" || item.work_status === "unknown" ? "badge-yellow" : "badge-gray"}`}
                >
                  {workLabel(item)}
                </span>
              </div>
              <div className="request-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => openSource(item.request_id)}
                >
                  Conferir fonte
                </button>
                {item.work_id && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => openReview(item.work_id!)}
                  >
                    Conferir análise
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {nextCursor && (
          <button
            type="button"
            className="button secondary load-more"
            disabled={loading}
            onClick={() => void load(nextCursor)}
          >
            Carregar mais
          </button>
        )}
        {loading && items.length === 0 && (
          <div
            className="skeleton-rows"
            role="status"
            aria-label="Carregando pedidos"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.4fr auto",
                  gap: "20px",
                  padding: "20px 26px",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "grid", gap: "6px" }}>
                  <div
                    className="skeleton"
                    style={{ height: "0.9rem", width: "70%" }}
                  />
                  <div
                    className="skeleton"
                    style={{ height: "0.75rem", width: "90%" }}
                  />
                </div>
                <div style={{ display: "grid", gap: "5px" }}>
                  {[0.8, 0.7, 0.75, 0.6].map((w, j) => (
                    <div
                      key={j}
                      className="skeleton"
                      style={{ height: "0.75rem", width: `${w * 100}%` }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div
                    className="skeleton"
                    style={{
                      height: "36px",
                      width: "100px",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {loading && items.length > 0 && (
          <p className="directory-state" role="status">
            Atualizando…
          </p>
        )}
      </section>
    </div>
  );
}
