import { useEffect, useState } from "react";
import { listTeamMembers, type TeamMember } from "./api";

export function useTeamNames(role: TeamMember["role"]) {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (role !== "administrator") return;
    let live = true;
    void (async () => {
      const found: Record<string, string> = {};
      let cursor: string | undefined;
      try {
        for (let pageCount = 0; pageCount < 10; pageCount += 1) {
          const page = await listTeamMembers(cursor);
          for (const member of page.items) found[member.id] = member.email;
          if (!page.next_cursor) break;
          cursor = page.next_cursor;
        }
      } catch {
        /* names are a convenience; the list still works without them */
      }
      if (live) setNames(found);
    })();
    return () => {
      live = false;
    };
  }, [role]);

  return names;
}
