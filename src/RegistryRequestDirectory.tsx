import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, listTeamRegistryRequests } from "./api";
import { registryStatusLabel, sourceLabel } from "./display-labels";
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
  REGISTRY_VIEWS,
  SOURCE_FILTERS,
  productLabel,
  registryBadge,
  registryKpis,
  registryTimeline,
  registryTone,
  registryView,
  registryViewCounts,
  type RegistryRow,
  type RegistryViewId,
} from "./registry-requests-model";
import { useNow } from "./useNow";
import "./ops.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

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

export function RegistryRequestDirectory({
  onUnauthorized,
}: {
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<RegistryRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<RegistryViewId>("all");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<RegistryRow | null>(null);
  const [sheet, setSheet] = useState(false);
  const [prefs, setPrefs] = useOpsPrefs("registry-requests");
  const trigger = useRef<HTMLElement | null>(null);
  const sheetTrigger = useRef<HTMLButtonElement>(null);
  const now = useNow();

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const result = await listTeamRegistryRequests({
          cursor,
          source: source || undefined,
        });
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
    [onUnauthorized, source],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const counts = useMemo(() => registryViewCounts(items), [items]);
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (view === "all" || registryView(item) === view) &&
          matchesQuery(
            [
              item.id,
              productLabel(item.product),
              registryStatusLabel(item.status),
            ],
            query,
          ),
      ),
    [items, view, query],
  );

  const columns: OpsColumn<RegistryRow>[] = useMemo(
    () => [
      {
        id: "id",
        label: "Pedido",
        locked: true,
        render: (item) => (
          <span className="ops-id">
            <strong>{shortId(item.id)}</strong>
            <small>{dateTime.format(new Date(item.created_at))}</small>
          </span>
        ),
        text: (item) => item.id,
      },
      {
        id: "source",
        label: "Fonte",
        render: (item) => sourceLabel(item.source),
        text: (item) => sourceLabel(item.source),
      },
      {
        id: "product",
        label: "Produto",
        hideBelow: "tablet",
        render: (item) => productLabel(item.product),
        text: (item) => productLabel(item.product),
      },
      {
        id: "items",
        label: "Itens",
        hideBelow: "tablet",
        render: (item) => item.item_count,
        text: (item) => String(item.item_count),
      },
      {
        id: "status",
        label: "Estado",
        render: (item) => (
          <span className={`badge badge-${registryBadge(item)}`}>
            {registryStatusLabel(item.status)}
          </span>
        ),
        text: (item) => registryStatusLabel(item.status),
      },
      {
        id: "age",
        label: "Idade",
        align: "end",
        render: (item) => (
          <AgeBadge
            iso={item.created_at}
            now={now}
            warnAfterHours={12}
            dangerAfterHours={48}
          />
        ),
        text: (item) => item.created_at,
      },
    ],
    [now],
  );

  function exportCsv() {
    const shown = columns.filter((column) => !prefs.hidden.includes(column.id));
    download(
      `pedidos-registrais_${new Date(now).toISOString().slice(0, 10)}.csv`,
      rowsToCsv(
        shown.map((column) => column.label),
        visible.map((item) => shown.map((column) => column.text(item))),
      ),
    );
  }

  return (
    <section className="page ops" aria-labelledby="reg-title">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">Operação</p>
          <h1 className="page-title" id="reg-title">
            Pedidos registrais
          </h1>
          <p className="page-subtitle">
            Pedidos por número, CNM e endereço. Um estado pendente não comprova
            cotação aprovada, pagamento ou compra no fornecedor.
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
        items={registryKpis(items)}
        active={view === "all" ? null : view}
        onPick={(id) => setView((id as RegistryViewId | null) ?? "all")}
      />

      <OpsViews
        label="Visões"
        active={view}
        onPick={(id) => setView(id as RegistryViewId)}
        views={REGISTRY_VIEWS.map((entry) => ({
          ...entry,
          count: counts[entry.id],
        }))}
      />

      <div className="ops-filters">
        <div className="ops-search">
          <label className="sr-only" htmlFor="reg-search">
            Buscar pedido registral
          </label>
          <input
            id="reg-search"
            className="input"
            type="search"
            placeholder="Buscar pelo código ou produto"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className="input ops-filter-desktop"
          aria-label="Fonte"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          {SOURCE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(query || source || view !== "all") && (
          <button
            type="button"
            className="btn btn-ghost btn-md ops-filter-desktop"
            onClick={() => {
              setQuery("");
              setSource("");
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
          Filtros{source ? " (1)" : ""}
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
              ? "Nenhum pedido registral encontrado"
              : "Nenhum pedido nesta visão"}
          </strong>
          <span>
            {items.length === 0
              ? "Os pedidos por número, CNM e endereço aparecem aqui."
              : "Troque a visão ou limpe a busca para ver os outros pedidos carregados."}
          </span>
        </div>
      ) : (
        <OpsTable
          label="Pedidos registrais"
          columns={columns}
          rows={visible}
          rowKey={(item) => item.id}
          hidden={prefs.hidden}
          density={prefs.density}
          selectedKey={selected?.id ?? null}
          rowTone={registryTone}
          onOpen={(item, element) => {
            trigger.current = element;
            setSelected(item);
          }}
          card={(item) => (
            <>
              <span className="ops-card-top">
                <strong>{shortId(item.id)}</strong>
                <AgeBadge
                  iso={item.created_at}
                  now={now}
                  warnAfterHours={12}
                  dangerAfterHours={48}
                />
              </span>
              <span className="ops-card-badges">
                <span className={`badge badge-${registryBadge(item)}`}>
                  {registryStatusLabel(item.status)}
                </span>
              </span>
              <span className="ops-card-meta">
                {sourceLabel(item.source)} · {productLabel(item.product)} ·{" "}
                {item.item_count} {item.item_count === 1 ? "item" : "itens"}
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
        title={selected ? `Pedido ${shortId(selected.id)}` : ""}
        subtitle={
          selected ? dateTime.format(new Date(selected.created_at)) : undefined
        }
        badges={
          selected && (
            <span className={`badge badge-${registryBadge(selected)}`}>
              {registryStatusLabel(selected.status)}
            </span>
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
                steps={registryTimeline(
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
                    <code>{selected.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Fonte</dt>
                  <dd>{sourceLabel(selected.source)}</dd>
                </div>
                <div>
                  <dt>Produto</dt>
                  <dd>{productLabel(selected.product)}</dd>
                </div>
                <div>
                  <dt>Itens</dt>
                  <dd>{selected.item_count}</dd>
                </div>
              </dl>
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
                setSource("");
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
              Ver resultados
            </button>
          </>
        }
      >
        <div className="form-field">
          <label className="form-field-label" htmlFor="reg-source-sheet">
            Fonte
          </label>
          <select
            id="reg-source-sheet"
            className="input"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            {SOURCE_FILTERS.map((option) => (
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
