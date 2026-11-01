import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, listTeamAnalysisRequests } from "./api";
import { matchesQuery, rowsToCsv } from "./ops-model";
import { OpsKpis, OpsViews } from "./OpsParts";
import { OpsTable, OpsViewMenu, type OpsColumn } from "./OpsTable";
import { useOpsPrefs } from "./useOpsPrefs";
import {
  REQUEST_VIEWS,
  paymentLabel,
  requestKpis,
  requestTone,
  requestView,
  viewCounts,
  workLabel,
  type RequestRow,
  type RequestViewId,
} from "./requests-model";
import { RequestCard } from "./RequestCard";
import { RequestFilterSheet } from "./RequestFilterSheet";
import { RequestRecordDrawer } from "./RequestRecordDrawer";
import { requestColumns } from "./request-columns";
import { DOCUMENT_FILTERS, download } from "./request-directory-model";
import { useNow } from "./useNow";
import "./ops.css";

export function RequestDirectory({
  canRead,
  onUnauthorized,
  openSource,
  openReview,
  readOnly = false,
  embedded = false,
}: {
  canRead: boolean;
  onUnauthorized: () => void;
  openSource: (requestId: string) => void;
  openReview: (workId: string) => void;
  /** Hides the actions that need a reviewer role. */
  readOnly?: boolean;
  /** Inside another page: no title, no page padding. */
  embedded?: boolean;
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
    () => requestColumns(now),
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
    <section
      className={embedded ? "ops ops-embedded" : "page ops"}
      aria-labelledby="req-title"
    >
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
          actions={readOnly ? undefined : rowActions}
          onOpen={(item, element) => {
            trigger.current = element;
            setSelected(item);
          }}
          card={(item) => <RequestCard item={item} now={now} />}
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

      <RequestRecordDrawer
        selected={selected}
        readOnly={readOnly}
        trigger={trigger}
        onClose={() => setSelected(null)}
        openSource={openSource}
        openReview={openReview}
      />

      <RequestFilterSheet
        open={sheet}
        documentState={documentState}
        resultCount={visible.length}
        sheetTrigger={sheetTrigger}
        onClose={() => setSheet(false)}
        onDocumentStateChange={setDocumentState}
      />
    </section>
  );
}
