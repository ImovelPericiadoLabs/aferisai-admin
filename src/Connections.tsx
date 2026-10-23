import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  listTeamConnections,
  revokeTeamConnection,
  type TeamConnection,
} from "./api";
import type { ToastKind } from "./useToast";
import { scopeLabel } from "./display-labels";
import { ConfirmDialog } from "./ConfirmDialog";
import { EntityPicker } from "./EntityPicker";
import {
  resolveApplication,
  resolveOrganization,
  searchApplications,
  searchOrganizations,
} from "./lookups";

function ScopeBadge({ scope }: { scope: string }) {
  const isAnalysis = scope.startsWith("analysis:");
  return (
    <span className={`badge ${isAnalysis ? "badge-blue" : "badge-gray"}`}>
      {scopeLabel(scope)}
    </span>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function Connections({
  canRead,
  canRevoke,
  csrf,
  onUnauthorized,
  onToast,
}: {
  canRead: boolean;
  canRevoke: boolean;
  csrf: string;
  onUnauthorized: () => void;
  onToast?: (msg: string, kind: ToastKind) => void;
}) {
  const [items, setItems] = useState<TeamConnection[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const applicationsSearch = useMemo(
    () => searchApplications(orgFilter),
    [orgFilter],
  );
  const applicationResolver = useMemo(
    () => resolveApplication(orgFilter),
    [orgFilter],
  );
  const [activeFilter, setActiveFilter] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function load(cursor?: string, filter?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await listTeamConnections(cursor, filter || undefined);
      setItems((current) =>
        cursor ? [...current, ...result.items] : result.items,
      );
      setNextCursor(result.next_cursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else if (cause instanceof ApiError && cause.status === 403)
        setError("Permissão insuficiente para consultar conexões.");
      else if (cause instanceof ApiError && cause.status === 503)
        setError("Serviço temporariamente indisponível. Tente novamente.");
      else
        setError(
          cause instanceof ApiError
            ? cause.detail
            : "Não foi possível consultar as conexões.",
        );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    let live = true;
    void listTeamConnections()
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        setNextCursor(result.next_cursor);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else if (cause instanceof ApiError && cause.status === 403)
          setError("Permissão insuficiente para consultar conexões.");
        else if (cause instanceof ApiError && cause.status === 503)
          setError("Serviço temporariamente indisponível. Tente novamente.");
        else
          setError(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível consultar as conexões.",
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [canRead, onUnauthorized]);

  if (!canRead)
    return (
      <p className="error" role="alert">
        Este papel não pode consultar conexões de parceiros.
      </p>
    );

  function submitFilter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActiveFilter(appFilter);
    void load(undefined, appFilter);
  }

  async function handleRevoke(item: TeamConnection) {
    setRevokingId(item.id);
    try {
      await revokeTeamConnection(item.id, csrf);
      setItems((current) => current.filter((c) => c.id !== item.id));
      setConfirmId(null);
      onToast?.("Conexão revogada.", "success");
    } catch (cause) {
      let msg = "Não foi possível revogar a conexão.";
      if (cause instanceof ApiError) {
        if (cause.status === 401) {
          onUnauthorized();
          return;
        }
        if (cause.status === 404)
          msg = "Conexão já revogada ou não encontrada.";
        else if (cause.status === 403)
          msg = "Permissão insuficiente para revogar.";
        else msg = cause.detail;
      }
      onToast?.(msg, "error");
      setConfirmId(null);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="content">
      <header className="page-head">
        <div>
          <p className="eyebrow">Parcerias</p>
          <h1>Conexões ativas</h1>
          <p className="muted">
            Consentimentos de titulares vinculados a aplicações parceiras.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void load(undefined, activeFilter)}
        >
          Atualizar
        </button>
      </header>

      <form
        onSubmit={submitFilter}
        style={{
          display: "flex",
          gap: "0.6rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: "1 1 240px", maxWidth: "320px" }}>
          <EntityPicker
            id="org-filter"
            label="Organização"
            hint="Escolha a organização para listar as aplicações dela."
            placeholder="Buscar organização"
            value={orgFilter}
            search={searchOrganizations}
            resolve={resolveOrganization}
            onChange={(id) => {
              setOrgFilter(id);
              setAppFilter("");
            }}
          />
        </div>
        <div style={{ flex: "1 1 240px", maxWidth: "320px" }}>
          <EntityPicker
            id="app-filter"
            label="Aplicação"
            placeholder={
              orgFilter ? "Buscar aplicação" : "Escolha a organização primeiro"
            }
            disabled={!orgFilter}
            value={appFilter}
            search={applicationsSearch}
            resolve={applicationResolver}
            cacheKey={orgFilter}
            onChange={setAppFilter}
          />
        </div>
        <button
          type="submit"
          className="button secondary"
          disabled={loading || !appFilter}
        >
          Filtrar
        </button>
        {activeFilter && (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setAppFilter("");
              setOrgFilter("");
              setActiveFilter("");
              void load(undefined, "");
            }}
          >
            Limpar filtro
          </button>
        )}
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <div
          className="skeleton-rows"
          role="status"
          aria-label="Carregando conexões"
        >
          {[0.7, 0.85, 0.6, 0.75, 0.65].map((w, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: "1rem",
                padding: "0.9rem 1rem",
                borderBottom: "1px solid var(--line)",
              }}
            >
              {[w, 0.6, 0.5, 0.3].map((ww, j) => (
                <div
                  key={j}
                  className="skeleton"
                  style={{ height: "0.85rem", width: `${ww * 100}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      ) : !error && items.length === 0 ? (
        <div className="empty-state">
          <p>
            Nenhuma conexão encontrada
            {activeFilter ? " para essa aplicação" : ""}.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" aria-label="Conexões ativas">
            <thead>
              <tr>
                <th>ID da conexão</th>
                <th>ID do titular</th>
                <th>ID da aplicação</th>
                <th>Escopos</th>
                <th>Versão</th>
                <th>Conectado em</th>
                {canRevoke && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <code
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "ui-monospace, monospace",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.id}
                    </code>
                  </td>
                  <td>
                    <code
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "ui-monospace, monospace",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.user_id}
                    </code>
                  </td>
                  <td>
                    <code
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "ui-monospace, monospace",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.application_id}
                    </code>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.3rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {item.scopes.map((s) => (
                        <ScopeBadge key={s} scope={s} />
                      ))}
                    </div>
                  </td>
                  <td>{item.grant_version}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(item.granted_at)}
                  </td>
                  {canRevoke && (
                    <td>
                      <button
                        type="button"
                        className="button secondary"
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.3rem 0.7rem",
                        }}
                        disabled={revokingId !== null}
                        onClick={() => {
                          setConfirmId(item.id);
                        }}
                      >
                        Revogar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        tone="danger"
        title="Revogar esta conexão?"
        description="O titular perde o consentimento ativo para a aplicação. Para voltar a usar, ele precisará autorizar novamente."
        details={[
          { label: "Conexão", value: confirmId ?? "" },
          {
            label: "Titular",
            value: items.find((item) => item.id === confirmId)?.user_id ?? "",
          },
        ]}
        confirmLabel="Revogar conexão"
        busy={revokingId !== null}
        onConfirm={() => {
          const target = items.find((item) => item.id === confirmId);
          if (target) void handleRevoke(target);
        }}
        onCancel={() => setConfirmId(null)}
      />

      {loading && items.length > 0 && (
        <p className="directory-state" role="status">
          Atualizando…
        </p>
      )}

      {nextCursor && (
        <button
          type="button"
          className="button secondary"
          disabled={loading}
          style={{ marginTop: "1rem" }}
          onClick={() => void load(nextCursor, activeFilter)}
        >
          {loading ? "Carregando…" : "Mais"}
        </button>
      )}
    </div>
  );
}
