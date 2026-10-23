import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  listTeamMembers,
  type ManagementEvent,
  type ManagementEventPage,
} from "./api";
import {
  eventActorLabel,
  eventLabel,
  eventValueLabel,
} from "./management-model";
import "./partner-people.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

let namesCache: Promise<Map<string, string>> | null = null;

/** Team member e-mails by id, loaded once (a few pages at most) to name who acted. */
function teamNames(): Promise<Map<string, string>> {
  namesCache ??= (async () => {
    const names = new Map<string, string>();
    let cursor: string | undefined;
    for (let page = 0; page < 5; page += 1) {
      const result = await listTeamMembers(cursor);
      for (const member of result.items) names.set(member.id, member.email);
      if (!result.next_cursor) break;
      cursor = result.next_cursor;
    }
    return names;
  })().catch(() => {
    namesCache = null;
    return new Map<string, string>();
  });
  return namesCache;
}

export function ManagementHistory({
  load,
  onUnauthorized,
}: {
  load: (cursor?: string) => Promise<ManagementEventPage>;
  onUnauthorized: () => void;
}) {
  const [events, setEvents] = useState<ManagementEvent[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState("");
  const [names, setNames] = useState<Map<string, string> | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (next?: string) => {
      try {
        const page = await load(next);
        setEvents((current) =>
          next ? [...(current ?? []), ...page.items] : page.items,
        );
        setCursor(page.next_cursor);
        setFailed("");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else
          setFailed(
            cause instanceof ApiError
              ? cause.detail
              : "Não foi possível carregar o histórico.",
          );
      } finally {
        setLoadingMore(false);
      }
    },
    [load, onUnauthorized],
  );

  useEffect(() => {
    queueMicrotask(() => void fetchPage());
    let live = true;
    void teamNames().then((map) => live && setNames(map));
    return () => {
      live = false;
    };
  }, [fetchPage]);

  if (failed)
    return (
      <div className="alert alert-danger" role="alert">
        {failed}{" "}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => void fetchPage()}
        >
          Tentar novamente
        </button>
      </div>
    );
  if (events === null)
    return (
      <div
        className="rules-skeleton"
        role="status"
        aria-label="Carregando histórico"
      >
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
    );
  if (events.length === 0)
    return (
      <div className="empty-state" role="status">
        <strong>Sem registros</strong>
        <span>Eventos anteriores à trilha de auditoria não são inferidos.</span>
      </div>
    );
  return (
    <>
      <ol className="people-timeline">
        {events.map((event) => (
          <li key={event.id}>
            <strong>{eventLabel(event.action)}</strong>
            <small>
              {dateTime.format(new Date(event.created_at))} ·{" "}
              {eventActorLabel(event.actor_team_member_id, names)}
            </small>
            {(event.previous_value || event.new_value) && (
              <small>
                {event.previous_value
                  ? `${eventValueLabel(event.action, event.previous_value)} → `
                  : ""}
                {eventValueLabel(event.action, event.new_value ?? null)}
              </small>
            )}
            <p>{event.reason}</p>
          </li>
        ))}
      </ol>
      {cursor && (
        <button
          type="button"
          className="btn btn-secondary btn-md"
          disabled={loadingMore}
          onClick={() => {
            setLoadingMore(true);
            void fetchPage(cursor);
          }}
        >
          Carregar mais
        </button>
      )}
    </>
  );
}
