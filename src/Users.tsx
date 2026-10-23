import { useEffect, useState } from "react";
import { ApiError, listTeamUsers, type TeamUser } from "./api";
import { PeopleDirectory } from "./PeopleDirectory";
import { PersonManagement } from "./PersonManagement";
import type { ToastKind } from "./useToast";
import type { PeopleTab } from "./people-model";

export function Users({
  canRead,
  isAdmin,
  csrf,
  actorId,
  tabs,
  onTab,
  onUnauthorized,
  onToast,
}: {
  canRead: boolean;
  isAdmin: boolean;
  csrf: string;
  actorId: string;
  onToast: (message: string, tone: ToastKind) => void;
  tabs: PeopleTab[];
  onTab: (page: PeopleTab["page"]) => void;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<TeamUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  function handleError(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
    else if (cause instanceof ApiError && cause.status === 403)
      setError("Permissão insuficiente para consultar usuários.");
    else if (cause instanceof ApiError && cause.status === 503)
      setError("Serviço temporariamente indisponível. Tente novamente.");
    else
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível consultar os usuários.",
      );
  }

  async function load(cursor?: string, filter?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await listTeamUsers(cursor, filter || undefined);
      setItems((current) =>
        cursor ? [...current, ...result.items] : result.items,
      );
      setNextCursor(result.next_cursor);
    } catch (cause) {
      handleError(cause);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    let live = true;
    void listTeamUsers()
      .then((result) => {
        if (!live) return;
        setItems(result.items);
        setNextCursor(result.next_cursor);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        handleError(cause);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  if (!canRead)
    return (
      <p className="error" role="alert">
        Este papel não pode consultar usuários.
      </p>
    );

  function changeFilter(value: string) {
    setStatusFilter(value);
    void load(undefined, value);
  }

  return (
    <PeopleDirectory
      title="Usuários"
      subtitle="Contas cadastradas na plataforma. Selecione uma conta para ver os detalhes ou, sendo administrador, suspender o acesso."
      tabs={tabs}
      activeTab="users"
      onTab={onTab}
      people={items}
      showRole={false}
      loading={loading}
      error={error}
      hasMore={Boolean(nextCursor)}
      onLoadMore={() => void load(nextCursor ?? undefined, statusFilter)}
      onRefresh={() => void load(undefined, statusFilter)}
      serverStatusFilter={{ value: statusFilter, onChange: changeFilter }}
      renderManagement={(person) => (
        <PersonManagement
          kind="user"
          person={person}
          csrf={csrf}
          actorId={actorId}
          isAdmin={isAdmin}
          onUnauthorized={onUnauthorized}
          onToast={onToast}
          onChanged={(change) =>
            setItems((current) =>
              current.map((item) =>
                item.id === person.id ? { ...item, ...change } : item,
              ),
            )
          }
        />
      )}
    />
  );
}
