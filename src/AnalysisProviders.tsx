import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  listAnalysisProviderAccounts,
  type AnalysisProviderAccount,
} from "./api";
import { AnalysisProviderForm } from "./AnalysisProviderForm";
import { AnalysisProviderPanel, kindLabels } from "./AnalysisProviderPanel";
import { statusLabel } from "./display-labels";
import { formatCostPerDay } from "./provider-model";
import { providerStatusTone } from "./status-tones";
import { useDialogFocus } from "./useDialogFocus";
import "./analysis-providers.css";

type Filter = "" | AnalysisProviderAccount["status"];
type Drawer = "closed" | "view" | "create";

const filters: { value: Filter; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativas" },
  { value: "suspended", label: "Suspensas" },
];

function errorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 404 || cause.status === 501)
      return "A gestão de provedores ainda não está disponível nesta API.";
    return cause.detail;
  }
  return "Não foi possível consultar a API. Tente novamente.";
}

export function AnalysisProviders({
  csrf,
  onUnauthorized,
}: {
  csrf: string;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<AnalysisProviderAccount[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState<Filter>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>("closed");
  const [notice, setNotice] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const lastOpened = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    listAnalysisProviderAccounts()
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        setCursor(result.next_cursor);
        setAvailable(true);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        if (
          cause instanceof ApiError &&
          (cause.status === 404 || cause.status === 501)
        )
          setAvailable(false);
        setError(errorText(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [revision, onUnauthorized]);

  async function reload() {
    setRevision((value) => value + 1);
    try {
      const result = await listAnalysisProviderAccounts();
      setItems(result.items);
      setCursor(result.next_cursor);
      setError("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      setError(errorText(cause));
    }
  }

  async function more() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await listAnalysisProviderAccounts(cursor);
      setItems((current) => [...current, ...result.items]);
      setCursor(result.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }

  function closeDrawer() {
    setDrawer("closed");
  }

  useDialogFocus(drawer !== "closed", panelRef, closeDrawer, {
    returnFocus: () =>
      document.querySelector<HTMLElement>(
        `[data-row-id="${lastOpened.current}"]`,
      ) ?? document.querySelector<HTMLElement>(".page-header .btn-primary"),
  });

  const counts = useMemo(
    () => ({
      "": items.length,
      draft: items.filter((item) => item.status === "draft").length,
      active: items.filter((item) => item.status === "active").length,
      suspended: items.filter((item) => item.status === "suspended").length,
    }),
    [items],
  );
  const visible = items.filter((item) => !filter || item.status === filter);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <section className="page providers" aria-labelledby="providers-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="providers-title">
            Provedores de IA
          </h1>
          <p className="page-subtitle">
            Contas Gemini, OpenAI ou de APIs compatíveis usadas nas análises.
            Cada conta nasce em rascunho e só é ativada depois de conferir o
            perfil, o custo e a capacidade.
          </p>
        </div>
        {available && (
          <button
            className="btn btn-primary btn-md"
            type="button"
            onClick={() => {
              lastOpened.current = null;
              setNotice("");
              setDrawer("create");
            }}
          >
            <span aria-hidden="true">＋</span> Nova conta
          </button>
        )}
      </header>

      <div className="alert" role="note">
        As contas cadastradas ainda não são usadas pelo worker e a troca
        automática entre contas não está ativa. Contas Gemini do mesmo projeto
        compartilham um limite conjunto observado de 12 chamadas simultâneas.
      </div>

      {notice && (
        <div className="alert alert-success prov-alert" role="status">
          {notice}
        </div>
      )}
      {error && items.length > 0 && drawer === "closed" && (
        <div className="alert alert-danger prov-alert" role="alert">
          {error}
        </div>
      )}

      {available && (
        <div
          className="prov-filters"
          role="group"
          aria-label="Filtrar por estado"
        >
          {filters.map((item) => (
            <button
              key={item.label}
              type="button"
              className="prov-chip"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span className="prov-chip-count">{counts[item.value]}</span>
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm prov-refresh"
            type="button"
            disabled={loading}
            onClick={() => void reload()}
          >
            Atualizar
          </button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div
          className="prov-skeleton"
          role="status"
          aria-label="Carregando contas"
        >
          {[0, 1, 2].map((index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
      ) : !available ? (
        <div className="error-state" role="alert">
          <strong>Gestão de provedores indisponível</strong>
          <span>{error}</span>
        </div>
      ) : error && items.length === 0 ? (
        <div className="error-state" role="alert">
          <strong>Não foi possível consultar as contas</strong>
          <span>{error}</span>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>
            {filter ? "Nenhuma conta neste estado" : "Nenhuma conta cadastrada"}
          </strong>
          <span>
            {filter
              ? "Altere o filtro para ver outras contas."
              : "Adicione a primeira conta para configurar os provedores de análise."}
          </span>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table
            className="data-table prov-table"
            aria-label="Contas de provedor"
          >
            <thead>
              <tr>
                <th scope="col">Conta</th>
                <th scope="col">Modelo</th>
                <th scope="col">Pool</th>
                <th scope="col">Estado</th>
                <th scope="col">Limites</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={item.id}
                  data-clickable
                  className={
                    item.id === selectedId && drawer === "view"
                      ? "selected"
                      : undefined
                  }
                  onClick={() => {
                    lastOpened.current = item.id;
                    setSelectedId(item.id);
                    setDrawer("view");
                  }}
                >
                  <td data-label="Conta">
                    <button
                      className="prov-name"
                      type="button"
                      data-row-id={item.id}
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        event.stopPropagation();
                        lastOpened.current = item.id;
                        setSelectedId(item.id);
                        setDrawer("view");
                      }}
                    >
                      <strong>{item.label}</strong>
                      <small>{kindLabels[item.kind]}</small>
                    </button>
                  </td>
                  <td data-label="Modelo">{item.model}</td>
                  <td data-label="Pool">{item.pool_key}</td>
                  <td data-label="Estado">
                    <span
                      className={`badge ${providerStatusTone(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td data-label="Limites">
                    <span className="prov-limit">
                      {formatCostPerDay(item.daily_cost_cents)}
                    </span>
                    <small className="prov-limit-sub">
                      {item.rpm} req/min · prioridade {item.priority}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cursor && (
        <footer className="prov-footer">
          <span>{items.length} contas carregadas</span>
          <button
            className="btn btn-secondary btn-md"
            type="button"
            disabled={loading}
            onClick={() => void more()}
          >
            Carregar mais
          </button>
        </footer>
      )}

      {createPortal(
        <>
          {drawer !== "closed" && (
            <div className="detail-panel-overlay" onClick={closeDrawer} />
          )}
          <aside
            className={`detail-panel detail-panel-wide${drawer !== "closed" ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prov-panel-title"
            aria-hidden={drawer === "closed"}
            ref={panelRef}
          >
            {drawer === "create" && (
              <AnalysisProviderForm
                csrf={csrf}
                onUnauthorized={onUnauthorized}
                onReload={reload}
                onCreated={async () => {
                  await reload();
                  setNotice("Conta cadastrada em rascunho.");
                  setDrawer("closed");
                }}
                onClose={closeDrawer}
              />
            )}
            {drawer === "view" && selected && (
              <AnalysisProviderPanel
                key={`${selected.id}:${selected.version}`}
                account={selected}
                csrf={csrf}
                onUnauthorized={onUnauthorized}
                onChanged={reload}
                onClose={closeDrawer}
              />
            )}
          </aside>
        </>,
        document.body,
      )}
    </section>
  );
}
