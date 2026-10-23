import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, listTeamAnalysisRequests } from "./api";
import { matchesQuery, rowsToCsv } from "./ops-model";
import {
  AgeBadge,
  BottomSheet,
  OpsKpis,
  OpsTimeline,
  OpsViews,
  RecordDrawer,
} from "./OpsParts";
import { OpsTable, OpsViewMenu, type OpsColumn } from "./OpsTable";
import { useOpsPrefs } from "./useOpsPrefs";
import {
  REQUEST_VIEWS,
  admissionLabel,
  documentLabels,
  documentTone,
  paymentLabel,
  paymentTone,
  requestKpis,
  requestTimeline,
  requestTone,
  requestView,
  viewCounts,
  workLabel,
  workTone,
  type RequestRow,
  type RequestViewId,
} from "./requests-model";
import { useNow } from "./useNow";
import "./ops.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const DOCUMENT_FILTERS = [
  { value: "", label: "Qualquer original" },
  { value: "available", label: "Original disponível" },
  { value: "expired", label: "Original vencido" },
  { value: "purged", label: "Original eliminado" },
];

const shortId = (id: string) => id.slice(-8);

function download(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Badge({ tone, children }: { tone: string; children: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
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
  const [items, setItems] = useState<RequestRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<RequestViewId>("all");
  const [query, setQuery] = useState("");
  const [documentState, setDocumentState] = useState("");
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [sheet, setSheet] = useState(false);
  const [prefs, setPrefs] = useOpsPrefs("requests");
  const trigger = useRef<HTMLElement | null>(null);
  const sheetTrigger = useRef<HTMLButtonElement>(null);
  const now = useNow();

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const result = await listTeamAnalysisRequests(cursor);
        setItems((current) =>
          cursor ? [...current, ...result.items] : result.items,
        );
        setNextCursor(result.next_cursor);
        setError("");
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
    },
    [onUnauthorized],
  );

  useEffect(() => {
    if (canRead) queueMicrotask(() => void load());
  }, [canRead, load]);

  const counts = useMemo(() => viewCounts(items), [items]);
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (view === "all" || requestView(item) === view) &&
          (!documentState || item.document_state === documentState) &&
          matchesQuery(
            [item.request_id, workLabel(item), paymentLabel(item)],
            query,
          ),
      ),
    [items, view, documentState, query],
  );

  const columns: OpsColumn<RequestRow>[] = useMemo(
    () => [
      {
        id: "id",
        label: "Pedido",
        locked: true,
        render: (item) => (
          <span className="ops-id">
            <strong>{shortId(item.request_id)}</strong>
            <small>{dateTime.format(new Date(item.created_at))}</small>
          </span>
        ),
        text: (item) => item.request_id,
      },
      {
        id: "pages",
        label: "Páginas",
        hideBelow: "tablet",
        render: (item) => item.page_count,
        text: (item) => String(item.page_count),
      },
      {
        id: "document",
        label: "Original",
        render: (item) => (
          <Badge tone={documentTone(item)}>
            {documentLabels[item.document_state]}
          </Badge>
        ),
        text: (item) => documentLabels[item.document_state],
      },
      {
        id: "admission",
        label: "Arquivo",
        hideBelow: "tablet",
        render: (item) => admissionLabel(item),
        text: admissionLabel,
      },
      {
        id: "payment",
        label: "Pagamento",
        render: (item) => (
          <Badge tone={paymentTone(item)}>{paymentLabel(item)}</Badge>
        ),
        text: paymentLabel,
      },
      {
        id: "work",
        label: "Análise",
        render: (item) => (
          <Badge tone={workTone(item)}>{workLabel(item)}</Badge>
        ),
        text: workLabel,
      },
      {
        id: "age",
        label: "Idade",
        align: "end",
        render: (item) => <AgeBadge iso={item.created_at} now={now} />,
        text: (item) => item.created_at,
      },
    ],
    [now],
  );

  function exportCsv() {
    const shown = columns.filter((column) => !prefs.hidden.includes(column.id));
    download(
      `pedidos-arquivo_${new Date(now).toISOString().slice(0, 10)}.csv`,
      rowsToCsv(
        shown.map((column) => column.label),
        visible.map((item) => shown.map((column) => column.text(item))),
      ),
    );
  }

  if (!canRead)
    return (
      <section className="page ops">
        <p className="alert alert-danger" role="alert">
          Este papel não pode consultar pedidos jurídicos.
        </p>
      </section>
    );

  const rowActions = (item: RequestRow) => (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={() => openSource(item.request_id)}
    >
      Fonte
    </button>
  );

  return (
    <section className="page ops" aria-labelledby="req-title">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">Operação</p>
          <h1 className="page-title" id="req-title">
            Pedidos de arquivo
          </h1>
          <p className="page-subtitle">
            O original, o PIX e a análise de cada pedido num só lugar. Toque ou
            pressione Enter numa linha para abrir a ficha.
          </p>
        </div>
        <div className="ops-head-actions">
          <OpsViewMenu columns={columns} prefs={prefs} onChange={setPrefs} />
          <button
            type="button"
            className="btn btn-secondary btn-md ops-desktop-only"
            disabled={visible.length === 0}
            onClick={exportCsv}
          >
            Exportar CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={loading}
            onClick={() => void load()}
          >
            Atualizar
          </button>
        </div>
      </header>

      <OpsKpis
        items={requestKpis(items)}
        active={view === "all" ? null : view}
        onPick={(id) => setView((id as RequestViewId | null) ?? "all")}
      />

      <OpsViews
        label="Visões"
        active={view}
        onPick={(id) => setView(id as RequestViewId)}
        views={REQUEST_VIEWS.map((entry) => ({
          ...entry,
          count: counts[entry.id],
        }))}
      />

      <div className="ops-filters">
        <div className="ops-search">
          <label className="sr-only" htmlFor="req-search">
            Buscar pedido
          </label>
          <input
            id="req-search"
            className="input"
            type="search"
            placeholder="Buscar pelo código do pedido"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className="input ops-filter-desktop"
          aria-label="Situação do original"
          value={documentState}
          onChange={(event) => setDocumentState(event.target.value)}
        >
          {DOCUMENT_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(query || documentState || view !== "all") && (
          <button
            type="button"
            className="btn btn-ghost btn-md ops-filter-desktop"
            onClick={() => {
              setQuery("");
              setDocumentState("");
              setView("all");
            }}
          >
            Limpar
          </button>
        )}
        <button
          ref={sheetTrigger}
          type="button"
          className="btn btn-secondary btn-md ops-filter-phone"
          aria-haspopup="dialog"
          onClick={() => setSheet(true)}
        >
          Filtros{documentState ? " (1)" : ""}
        </button>
      </div>

      {error && (
        <div className="error-state" role="alert">
          <strong>Não foi possível consultar os pedidos</strong>
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

      {loading && items.length === 0 && !error ? (
        <div
          className="rules-skeleton"
          role="status"
          aria-label="Carregando pedidos"
        >
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ) : !error && visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {items.length === 0
              ? "Nenhum pedido encontrado"
              : "Nenhum pedido nesta visão"}
          </strong>
          <span>
            {items.length === 0
              ? "Os pedidos de arquivo aparecem aqui assim que os clientes enviarem."
              : "Troque a visão ou limpe a busca para ver os outros pedidos carregados."}
          </span>
        </div>
      ) : (
        <OpsTable
          label="Pedidos de arquivo"
          columns={columns}
          rows={visible}
          rowKey={(item) => item.request_id}
          hidden={prefs.hidden}
          density={prefs.density}
          selectedKey={selected?.request_id ?? null}
          rowTone={requestTone}
          actions={rowActions}
          onOpen={(item, element) => {
            trigger.current = element;
            setSelected(item);
          }}
          card={(item) => (
            <>
              <span className="ops-card-top">
                <strong>{shortId(item.request_id)}</strong>
                <AgeBadge iso={item.created_at} now={now} />
              </span>
              <span className="ops-card-badges">
                <Badge tone={paymentTone(item)}>{paymentLabel(item)}</Badge>
                <Badge tone={workTone(item)}>{workLabel(item)}</Badge>
              </span>
              <span className="ops-card-meta">
                {item.page_count} {item.page_count === 1 ? "página" : "páginas"}{" "}
                · {documentLabels[item.document_state]}
              </span>
            </>
          )}
        />
      )}

      <div className="ops-foot">
        <span>
          {visible.length === items.length
            ? `${items.length} pedidos carregados`
            : `${visible.length} de ${items.length} carregados`}
          <span className="ops-hint"> · J e K navegam, Enter abre</span>
        </span>
        {nextCursor && (
          <button
            type="button"
            className="btn btn-secondary btn-md"
            disabled={loading}
            onClick={() => void load(nextCursor)}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        )}
      </div>

      <RecordDrawer
        open={selected !== null}
        title={selected ? `Pedido ${shortId(selected.request_id)}` : ""}
        subtitle={
          selected ? dateTime.format(new Date(selected.created_at)) : undefined
        }
        badges={
          selected && (
            <>
              <Badge tone={paymentTone(selected)}>
                {paymentLabel(selected)}
              </Badge>
              <Badge tone={workTone(selected)}>{workLabel(selected)}</Badge>
            </>
          )
        }
        onClose={() => setSelected(null)}
        returnFocus={() => trigger.current}
      >
        {selected && (
          <>
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">Linha do tempo</h3>
              <OpsTimeline
                steps={requestTimeline(
                  selected,
                  dateTime.format(new Date(selected.created_at)),
                )}
              />
              <p className="ops-missing">
                A data de cada etapa ainda não vem do backend; só a criação.
              </p>
            </section>
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">Resumo</h3>
              <dl className="ops-facts">
                <div>
                  <dt>Código completo</dt>
                  <dd>
                    <code>{selected.request_id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Páginas</dt>
                  <dd>{selected.page_count}</dd>
                </div>
                <div>
                  <dt>Original</dt>
                  <dd>{documentLabels[selected.document_state]}</dd>
                </div>
                <div>
                  <dt>Arquivo</dt>
                  <dd>{admissionLabel(selected)}</dd>
                </div>
              </dl>
            </section>
            <section className="detail-panel-section">
              <h3 className="detail-panel-section-title">Ações</h3>
              <div className="ops-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={() => openSource(selected.request_id)}
                >
                  Conferir fonte
                </button>
                {selected.work_id && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-md"
                    onClick={() => openReview(selected.work_id!)}
                  >
                    Conferir análise
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </RecordDrawer>

      <BottomSheet
        open={sheet}
        title="Filtros"
        onClose={() => setSheet(false)}
        returnFocus={() => sheetTrigger.current}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => {
                setDocumentState("");
                setSheet(false);
              }}
            >
              Limpar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => setSheet(false)}
            >
              Ver {visible.length}{" "}
              {visible.length === 1 ? "resultado" : "resultados"}
            </button>
          </>
        }
      >
        <div className="form-field">
          <label className="form-field-label" htmlFor="req-doc-sheet">
            Situação do original
          </label>
          <select
            id="req-doc-sheet"
            className="input"
            value={documentState}
            onChange={(event) => setDocumentState(event.target.value)}
          >
            {DOCUMENT_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </BottomSheet>
    </section>
  );
}
