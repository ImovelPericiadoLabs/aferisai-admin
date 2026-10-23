import { useEffect, useState } from "react";
import { ApiError, listTeamMembers, type TeamMemberListItem } from "./api";
import { PeopleDirectory } from "./PeopleDirectory";
import { PersonManagement } from "./PersonManagement";
import { TeamInvite } from "./TeamInvite";
import type { ToastKind } from "./useToast";
import type { PeopleTab } from "./people-model";

export function TeamMembers({
  isAdmin,
  csrf,
  actorId,
  tabs,
  onTab,
  onUnauthorized,
  onToast,
}: {
  isAdmin: boolean;
  csrf: string;
  actorId: string;
  onToast: (message: string, tone: ToastKind) => void;
  tabs: PeopleTab[];
  onTab: (page: PeopleTab["page"]) => void;
  onUnauthorized: () => void;
}) {
  const [items, setItems] = useState<TeamMemberListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function handleError(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
    else if (cause instanceof ApiError && cause.status === 403)
      setError("Apenas administradores podem consultar membros da equipe.");
    else if (cause instanceof ApiError && cause.status === 503)
      setError("Serviço temporariamente indisponível. Tente novamente.");
    else
      setError(
        cause instanceof ApiError
          ? cause.detail
          : "Não foi possível consultar os membros.",
      );
  }

  async function load(cursor?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await listTeamMembers(cursor);
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
    if (!isAdmin) return;
    let live = true;
    void listTeamMembers()
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
  }, [isAdmin]);

  if (!isAdmin)
    return (
      <p className="error" role="alert">
        Apenas administradores podem acessar a gestão de membros.
      </p>
    );

  return (
    <PeopleDirectory
      title="Equipe"
      subtitle="Contas internas com acesso ao painel. Selecione um membro para ver os detalhes, alterar o papel ou suspender o acesso."
      tabs={tabs}
      activeTab="team-members"
      onTab={onTab}
      people={items}
      showRole
      loading={loading}
      error={error}
      hasMore={Boolean(nextCursor)}
      onLoadMore={() => void load(nextCursor ?? undefined)}
      onRefresh={() => void load()}
      headerAction={
        <TeamInvite
          csrf={csrf}
          onUnauthorized={onUnauthorized}
          onToast={onToast}
        />
      }
      renderManagement={(person) => (
        <PersonManagement
          kind="team"
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
