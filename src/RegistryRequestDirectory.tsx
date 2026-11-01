import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, listTeamRegistryRequests } from "./api";
import { registryStatusLabel } from "./display-labels";
import { matchesQuery, rowsToCsv } from "./ops-model";
import { OpsKpis, OpsViews } from "./OpsParts";
import { OpsTable, OpsViewMenu, type OpsColumn } from "./OpsTable";
import { useOpsPrefs } from "./useOpsPrefs";
import {
  REGISTRY_VIEWS,
  SOURCE_FILTERS,
  productLabel,
  registryKpis,
  registryTone,
  registryView,
  registryViewCounts,
  type RegistryRow,
  type RegistryViewId,
} from "./registry-requests-model";
import { registryColumns } from "./registry-columns";
import { RegistryFilterSheet } from "./RegistryFilterSheet";
import { RegistryRecordDrawer } from "./RegistryRecordDrawer";
import { RegistryRequestCard } from "./RegistryRequestCard";
import { download } from "./request-directory-model";
import { useNow } from "./useNow";
import "./ops.css";

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
    () => registryColumns(now),
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
          card={(item) => <RegistryRequestCard item={item} now={now} />}
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

      <RegistryRecordDrawer
        selected={selected}
        trigger={trigger}
        onClose={() => setSelected(null)}
      />

      <RegistryFilterSheet
        open={sheet}
        source={source}
        sheetTrigger={sheetTrigger}
        onClose={() => setSheet(false)}
        onSourceChange={setSource}
      />
    </section>
  );
}
