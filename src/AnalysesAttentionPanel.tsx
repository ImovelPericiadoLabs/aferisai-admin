import { useMemo } from "react";
import {
  ATTENTION_VIEWS,
  attentionKpis,
  attentionTone,
  type AttentionRow,
  type AttentionViewId,
} from "./attention-model";
import { analysisWorkStatusLabel } from "./display-labels";
import { AgeBadge, OpsKpis, OpsViews } from "./OpsParts";
import { OpsTable, type OpsColumn } from "./OpsTable";
import type { AnalysesAttentionState } from "./useAnalysesAttention";

const short = (id: string) => id.slice(0, 8);

const statusTone = (status: AttentionRow["status"]) =>
  status === "failed" || status === "unknown"
    ? "danger"
    : status === "suspended"
      ? "warning"
      : "info";

export function AnalysesAttentionPanel({
  attention,
  now,
  onSeeDocument,
  onReview,
}: {
  attention: AnalysesAttentionState;
  now: number;
  onSeeDocument: (row: AttentionRow) => void;
  onReview: (row: AttentionRow) => void;
}) {
  const {
    rows,
    cursor,
    loading,
    error,
    view,
    setView,
    query,
    setQuery,
    counts,
    visible,
    load,
  } = attention;

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

  return (
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
                onClick={() => onSeeDocument(row)}
              >
                Ver documento
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onReview(row)}
              >
                Revisar
              </button>
            </span>
          )}
          onOpen={onReview}
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
  );
}
