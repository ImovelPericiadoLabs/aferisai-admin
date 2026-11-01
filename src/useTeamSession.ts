import { useCallback, useEffect, useState } from "react";
import { currentMember, renewCsrf } from "./api";
import type { Session } from "./team-session";

/** Restores the team session on mount and exposes the unauthorized handler. */
export function useTeamSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const unauthorize = useCallback(() => setSession(null), []);

  useEffect(() => {
    let live = true;
    Promise.all([renewCsrf(), currentMember()])
      .then(([result, member]) => {
        if (live) setSession({ csrf: result.csrf_token, member });
      })
      .catch(() => {
        if (live) setSession(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return { session, setSession, loading, unauthorize };
}
