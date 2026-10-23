import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, listAnalysisAttention, type AttentionPage } from "./api";
import { AnalysisReview } from "./AnalysisReview";
import {
  ATTENTION_VIEWS,
  attentionKpis,
  attentionTone,
  attentionView,
  attentionViewCounts,
  type AttentionRow,
  type AttentionViewId,
} from "./attention-model";
import { analysisWorkStatusLabel } from "./display-labels";
import { matchesQuery } from "./ops-model";
import { AgeBadge, OpsKpis, OpsViews } from "./OpsParts";
import { OpsTable, type OpsColumn } from "./OpsTable";
import { OriginalViewer, type OriginalTarget } from "./OriginalViewer";
import { RequestDirectory } from "./RequestDirectory";
import { useNow } from "./useNow";
import "./review.css";
import "./ops.css";

type Tab = "attention" | "review" | "requests";

const short = (id: string) => id.slice(0, 8);

const statusTone = (status: AttentionRow["status"]) =>
  status === "failed" || status === "unknown"
    ? "danger"
    : status === "suspended"
      ? "warning"
      : "info";

export function Analyses({
  csrf,
  canReview,
  onUnauthorized,
  initialWorkId,
  openSource,
}: {
  csrf: string;
  canReview: boolean;
  onUnauthorized: () => void;
  initialWorkId?: string;
  openSource?: (requestId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>(
    initialWorkId ? "review" : canReview ? "attention" : "requests",
  );
  const [reviewWorkId, setReviewWorkId] = useState(initialWorkId ?? "");
  const [rows, setRows] = useState<AttentionPage["items"]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(canReview);
  const [error, setError] = useState("");
  const [view, setView] = useState<AttentionViewId>("all");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<OriginalTarget | null>(null);
  const now = useNow();

  const load = useCallback(
    async (next?: string) => {
      setLoading(true);
      try {
        const page = await listAnalysisAttention(next);
        setRows((current) => (next ? [...current, ...page.items] : page.items));
        setCursor(page.next_cursor);
        setError("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar a API agora.",
          );
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    if (canReview) queueMicrotask(() => void load());
  }, [canReview, load]);

  const counts = useMemo(() => attentionViewCounts(rows), [rows]);
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (view === "all" || attentionView(row) === view) &&
          matchesQuery(
            [row.work_id, row.request_id, analysisWorkStatusLabel(row.status)],
            query,
          ),
      ),
    [rows, view, query],
  );

  const columns: OpsColumn<AttentionRow>[] = useMemo(
    () => [
      {
        id: "work",
        label: "Trabalho",
        locked: true,
        render: (row) => (
          <span className="ops-id">
            <strong>{short(row.work_id)}</strong>
            <small>pedido {short(row.request_id)}</small>
          </span>
        ),
        text: (row) => row.work_id,
      },
      {
        id: "status",
        label: "Situação",
        render: (row) => (
          <span className={`badge badge-${statusTone(row.status)}`}>
            {analysisWorkStatusLabel(row.status)}
          </span>
        ),
        text: (row) => analysisWorkStatusLabel(row.status),
      },
      {
        id: "error",
        label: "Erro",
        hideBelow: "tablet",
        render: (row) => (row.error_code ? "Falha registrada" : "—"),
        text: (row) => (row.error_code ? "Falha registrada" : ""),
      },
      {
        id: "age",
        label: "Parado há",
        align: "end",
        render: (row) =>
          row.finished_at ? (
            <AgeBadge
              iso={row.finished_at}
              now={now}
              warnAfterHours={12}
              dangerAfterHours={48}
            />
          ) : (
            "—"
          ),
        text: (row) => row.finished_at ?? "",
      },
    ],
    [now],
  );

  function seeDocument(row: AttentionRow) {
    setViewing({
      requestId: row.request_id,
      title: "Documento do pedido",
      facts: [
        { label: "Trabalho", value: row.work_id },
        { label: "Pedido", value: row.request_id },
        { label: "Situação", value: analysisWorkStatusLabel(row.status) },
      ],
    });
  }

  function review(row: AttentionRow) {
    setReviewWorkId(row.work_id);
    setTab("review");
  }

  const tabs: { id: Tab; label: string }[] = [
    ...(canReview
      ? [
          { id: "attention" as const, label: "Atenção" },
          { id: "review" as const, label: "Revisão" },
        ]
      : []),
    { id: "requests", label: "Pedidos" },
  ];

  return (
    <section className="page ops" aria-labelledby="ana-title">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">Operação</p>
          <h1 className="page-title" id="ana-title">
            Análises
          </h1>
          <p className="page-subtitle">
            O que pede atenção, a revisão humana de cada análise e os pedidos de
            arquivo. A classificação de fonte tem a própria fila.
          </p>
        </div>
        <div className="ops-head-actions">
          {tab === "attention" && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              disabled={loading}
              onClick={() => void load()}
            >
              Atualizar
            </button>
          )}
          <span className="badge badge-neutral">
            {canReview ? "Gestão" : "Leitura"}
          </span>
        </div>
      </header>

      <OpsViews
        label="Áreas de análise"
        active={tab}
        onPick={(id) => setTab(id as Tab)}
        views={tabs.map((entry) => ({
          ...entry,
          count: entry.id === "attention" ? counts.all : undefined,
        }))}
      />

      {tab === "attention" && canReview && (
        <>
          <OpsKpis
            items={attentionKpis(rows)}
            active={view === "all" ? null : view}
            onPick={(id) => setView((id as AttentionViewId | null) ?? "all")}
          />
          <OpsViews
            label="Visões"
            active={view}
            onPick={(id) => setView(id as AttentionViewId)}
            views={ATTENTION_VIEWS.map((entry) => ({
              ...entry,
              count: counts[entry.id],
            }))}
          />
          <div className="ops-filters">
            <div className="ops-search">
              <label className="sr-only" htmlFor="ana-search">
                Buscar trabalho ou pedido
              </label>
              <input
                id="ana-search"
                className="input"
                type="search"
                placeholder="Buscar pelo código do trabalho ou do pedido"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="error-state" role="alert">
              <strong>Não foi possível consultar as análises</strong>
              <span>{error}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void load()}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {loading && rows.length === 0 && !error ? (
            <div
              className="rules-skeleton"
              role="status"
              aria-label="Carregando atenção"
            >
              <span className="skeleton" />
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          ) : !error && visible.length === 0 ? (
            <div className="empty-state" role="status">
              <strong>
                {rows.length === 0
                  ? "Nada pede atenção agora"
                  : "Nenhum trabalho nesta visão"}
              </strong>
              <span>
                {rows.length === 0
                  ? "Falhas, resultados incertos e análises suspensas aparecem aqui."
                  : "Troque a visão ou limpe a busca."}
              </span>
            </div>
          ) : (
            <OpsTable
              label="Trabalhos que pedem atenção"
              columns={columns}
              rows={visible}
              rowKey={(row) => row.work_id}
              hidden={[]}
              density="comfortable"
              selectedKey={null}
              rowTone={attentionTone}
              actions={(row) => (
                <span className="ops-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    aria-haspopup="dialog"
                    data-original-for={row.work_id}
                    onClick={() => seeDocument(row)}
                  >
                    Ver documento
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => review(row)}
                  >
                    Revisar
                  </button>
                </span>
              )}
              onOpen={review}
              card={(row) => (
                <>
                  <span className="ops-card-top">
                    <strong>{short(row.work_id)}</strong>
                    {row.finished_at && (
                      <AgeBadge
                        iso={row.finished_at}
                        now={now}
                        warnAfterHours={12}
                        dangerAfterHours={48}
                      />
                    )}
                  </span>
                  <span className="ops-card-badges">
                    <span className={`badge badge-${statusTone(row.status)}`}>
                      {analysisWorkStatusLabel(row.status)}
                    </span>
                  </span>
                  <span className="ops-card-meta">
                    Pedido {short(row.request_id)}
                  </span>
                </>
              )}
            />
          )}

          <div className="ops-foot">
            <span>
              {visible.length === rows.length
                ? `${rows.length} trabalhos carregados`
                : `${visible.length} de ${rows.length} carregados`}
              <span className="ops-hint">
                {" "}
                · J e K navegam, Enter abre a revisão
              </span>
            </span>
            {cursor && (
              <button
                type="button"
                className="btn btn-secondary btn-md"
                disabled={loading}
                onClick={() => void load(cursor)}
              >
                {loading ? "Carregando…" : "Carregar mais"}
              </button>
            )}
          </div>
        </>
      )}

      {tab === "review" && canReview && (
        <AnalysisReview
          key={reviewWorkId}
          csrf={csrf}
          canReview={canReview}
          onUnauthorized={onUnauthorized}
          initialWorkId={reviewWorkId || undefined}
        />
      )}

      {tab === "requests" && (
        <RequestDirectory
          canRead
          embedded
          readOnly={!canReview}
          onUnauthorized={onUnauthorized}
          openSource={openSource ?? (() => undefined)}
          openReview={(workId) => {
            setReviewWorkId(workId);
            setTab("review");
          }}
        />
      )}

      <OriginalViewer
        target={viewing}
        csrf={csrf}
        onClose={() => setViewing(null)}
        onUnauthorized={onUnauthorized}
        returnFocus={() =>
          document.querySelector<HTMLElement>(
            `[data-original-for="${viewing?.facts[0]?.value ?? ""}"]`,
          )
        }
      />
    </section>
  );
}
