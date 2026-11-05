import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  listTeamConnections,
  revokeTeamConnection,
  type TeamConnection,
} from "./api";
import type { ToastKind } from "./useToast";
import { ConfirmDialog } from "./ConfirmDialog";
import { ConnectionsFilter } from "./ConnectionsFilter";
import { ConnectionsList } from "./ConnectionsList";
import { resolveApplication, searchApplications } from "./lookups";

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

      <ConnectionsFilter
        orgFilter={orgFilter}
        appFilter={appFilter}
        activeFilter={activeFilter}
        loading={loading}
        applicationsSearch={applicationsSearch}
        applicationResolver={applicationResolver}
        onUnauthorized={onUnauthorized}
        onOrganizationChange={(id) => {
          setOrgFilter(id);
          setAppFilter("");
        }}
        onApplicationChange={setAppFilter}
        onSubmit={submitFilter}
        onClear={() => {
          setAppFilter("");
          setOrgFilter("");
          setActiveFilter("");
          void load(undefined, "");
        }}
      />

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
        <ConnectionsList
          items={items}
          canRevoke={canRevoke}
          revoking={revokingId !== null}
          onRevoke={setConfirmId}
        />
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
